/**
 * ============================================================================
 * SERVICE POSTS ROUTES
 * ============================================================================
 * 
 * Last Updated: February 24, 2026
 * Changes: 
 * - Added GET /api/service-posts endpoint with query filtering for category requests
 * - Added JWT authentication to protect sensitive endpoints and user data
 * - FIXED: Type comparison bugs in authorization checks (String() wrapper added)
 * - FIXED: Missing route handler for ENDPOINT 9
 * - FIXED: Admin check using database is_admin flag
 * - Added sharp image compression (1200x1200 max, JPEG 80%) on photo upload
 * - Premium users get 10 photos per post, free users get 5
 * 
 * ENDPOINTS PROVIDED:
 * 1. GET  /api/service-posts/search          - Radius-based search (PUBLIC)
 * 2. GET  /api/service-posts                 - Get posts with filters (PUBLIC)
 * 3. GET  /api/service-posts/all             - Get all active posts (PUBLIC)
 * 4. GET  /api/service-posts/user/:userId    - Get user's posts (PROTECTED)
 * 5. POST /api/service-posts                 - Create new post (PROTECTED)
 * 6. GET  /api/service-posts/:postId         - Get single post (PUBLIC)
 * 7. PUT  /api/service-posts/:postId         - Update post (PROTECTED)
 * 8. DELETE /api/service-posts/:postId       - Delete post (PROTECTED)
 * 9. PATCH /api/service-posts/:postId/inactivate - Soft delete (PROTECTED)
 * 10. PATCH /api/service-posts/category-request/:requestId/status - Admin approve/reject (PROTECTED)
 * 11. POST /api/service-posts/:postId/photos   - Upload photo (PROTECTED) and Compression with sharp
 * ============================================================================
 */

import { Router, Request, Response, NextFunction } from 'express';
import { supabase } from "../config/Supabase";
import { createClient } from '@supabase/supabase-js';
import { calculateDistance } from '../utils/Distancecalculator';
import { 
  POST_STATUS, 
  POST_TYPES, 
  POSTER_TYPES,
  DEFAULT_SEARCH,
  LOGGING 
} from '../Constants/ServicePosts';
import { SUPABASE_ERROR } from '../Constants/supabase';
import { getZipCoordinates, getZipLocation } from '../services/zipCodeService';
import { authenticateToken, authorizeUser, AuthRequest } from '../middleware/auth';
import { sendCategoryRequestNotification, sendNewPostNotification, sendAdminAlert } from '../services/emailServices';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import heicConvert from 'heic-convert';
import sharp from 'sharp';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const router = Router();

// ============================================================================
// ENDPOINT 1: RADIUS-BASED SERVICE SEARCH (PUBLIC)
// ============================================================================
router.get('/api/service-posts/search', async (req: Request, res: Response): Promise<void> => {
  
  try {
    const { 
      service_category, 
      zip_code,
      radius = String(DEFAULT_SEARCH.RADIUS_MILES)
    } = req.query;

    console.log('🔍 Search request received:', { 
      service_category, 
      zip_code, 
      radius,
      timestamp: new Date().toISOString()
    });

    if (!service_category) {
      console.error('❌ Missing service_category parameter');
      res.status(400).json({
        success: false,
        error: 'Service category is required',
        hint: 'Add ?service_category=YourCategory to the URL'
      });
      return;
    }

    if (!zip_code) {
      console.error('❌ Missing zip_code parameter');
      res.status(400).json({
        success: false,
        error: 'ZIP code is required for radius search',
        hint: 'Add &zip_code=12345 to the URL'
      });
      return;
    }

    const radiusMiles = parseInt(radius as string);
    
    if (isNaN(radiusMiles) || radiusMiles < 1) {
      console.error('❌ Invalid radius value:', radius);
      res.status(400).json({
        success: false,
        error: 'Invalid radius value. Must be a positive number.',
        hint: 'Radius should be between 1 and 100 miles'
      });
      return;
    }

    console.log('✅ Parameters validated:', {
      category: service_category,
      zipCode: zip_code,
      radius: radiusMiles
    });

    console.log(`📍 Looking up coordinates for ZIP code ${zip_code}...`);
    
    const searchCoords = await getZipCoordinates(zip_code as string);
    
    if (!searchCoords) {
      console.error(`❌ Invalid or not found: ZIP ${zip_code}`);
      res.status(400).json({
        success: false,
        error: 'Invalid ZIP code or ZIP code not found',
        hint: 'Please provide a valid 5-digit US ZIP code'
      });
      return;
    }

    console.log(`✅ Search center established:`, {
      zipCode: zip_code,
      latitude: searchCoords.lat,
      longitude: searchCoords.lon
    });

    console.log(`📊 Querying database for category: ${service_category}`);
    console.log('   Fetching all active posts for distance calculation...');

    // Look up accepts_payment for this category separately
    const { data: categoryData } = await supabase
      .from('service_categories')
      .select('accepts_payment')
      .eq('category_name', service_category as string)
      .single();
    const acceptsPayment = categoryData?.accepts_payment ?? false;

    const { data, error } = await supabase
      .from('service_posts')
      .select(`
        *,
        users!service_posts_user_id_fkey(
          email,
          business_owners(business_name, average_rating, review_count, accepts_zelle_payment, payment_info, payment_method)
        )
      `)
      .eq('service_category', service_category as string)
      .eq('status', POST_STATUS.ACTIVE);

    if (error) {
      console.error('❌ Database query error:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      console.log(`ℹ️ No posts found in category: ${service_category}`);
      res.json({
        success: true,
        posts: [],
        searchCenter: {
          zipCode: zip_code,
          lat: searchCoords.lat,
          lon: searchCoords.lon
        },
        radius: radiusMiles,
        count: 0,
        message: `No ${service_category} services found in any location`
      });
      return;
    }

    console.log(`✅ Found ${data.length} total posts in category`);
    console.log('   Now calculating distances for each post...');

    const postsWithDistance = await Promise.all(
      data.map(async (post: any, index: number) => {
        if (index % LOGGING.PROGRESS_INTERVAL === 0) {
          console.log(`   Processing posts ${index + 1}-${Math.min(index + LOGGING.PROGRESS_INTERVAL, data.length)} of ${data.length}...`);
        }

        if (!post.zip_code) {
          console.log(`   ⚠️ Post ID ${post.id} has no ZIP code, skipping`);
          return null;
        }

        const postCoords = await getZipCoordinates(post.zip_code);
        
        if (!postCoords) {
          console.log(`   ⚠️ Invalid ZIP code ${post.zip_code} for post ID ${post.id}, skipping`);
          return null;
        }

        const distance = calculateDistance(
          searchCoords.lat,
          searchCoords.lon,
          postCoords.lat,
          postCoords.lon
        );

        const roundedDistance = Math.round(distance * Math.pow(10, DEFAULT_SEARCH.DISTANCE_PRECISION)) 
                                 / Math.pow(10, DEFAULT_SEARCH.DISTANCE_PRECISION);

        if (index < 5) {
          console.log(`   📏 Post ${post.id} (${post.zip_code}): ${roundedDistance} miles away`);
        }

        if (roundedDistance > radiusMiles) {
          return null;
        }

        return {
          ...post,
          post_id: post.id,
          distance: roundedDistance,
          poster_name: post.users?.business_owners?.business_name ||
                       post.users?.email,
          business_name: post.users?.business_owners?.business_name,
          average_rating: post.users?.business_owners?.average_rating || 0,
          review_count: post.users?.business_owners?.review_count || 0,
          photos: post.photos || [],
          accepts_payment: acceptsPayment,
          provider_accepts_zelle: acceptsPayment,
          payment_method: post.users?.business_owners?.payment_method || null,
        };
      })
    );

    console.log('   ✅ Distance calculation complete');

    const nearbyPosts = postsWithDistance
      .filter(post => post !== null)
      .sort((a, b) => a!.distance - b!.distance);

    console.log(`✅ Search complete: ${nearbyPosts.length} posts found within ${radiusMiles} miles`);
    if (nearbyPosts.length > 0) {
      console.log(`   Closest: ${nearbyPosts[0]!.distance} miles`);
      console.log(`   Farthest: ${nearbyPosts[nearbyPosts.length - 1]!.distance} miles`);
    }

    res.json({
      success: true,
      posts: nearbyPosts,
      searchCenter: {
        zipCode: zip_code,
        lat: searchCoords.lat,
        lon: searchCoords.lon
      },
      radius: radiusMiles,
      count: nearbyPosts.length
    });

  } catch (error: unknown) {
    console.error('❌ Error in search endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search service posts',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ============================================================================
// ENDPOINT 2: GET SERVICE POSTS WITH FILTERS (PUBLIC)
// ============================================================================
router.get('/api/service-posts', async (req: Request, res: Response): Promise<void> => {
  try {
    const { post_type, service_category, zip_code, user_id } = req.query;

    console.log('📋 Fetching service posts with filters:', req.query);

    let query = supabase
      .from('service_posts')
      .select(`
        *,
        users!service_posts_user_id_fkey(
          email,
          business_owners(business_name, average_rating, review_count, accepts_zelle_payment, payment_info, payment_method)
        )
      `)
      .order('created_at', { ascending: false });
    if (post_type) query = query.eq('post_type', post_type);
    if (service_category) query = query.eq('service_category', service_category);
    if (zip_code) query = query.eq('zip_code', zip_code);
    if (user_id) query = query.eq('user_id', user_id);

    const { data: posts, error } = await query;

    if (error) {
      console.error('❌ Error fetching service posts:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch service posts',
        details: error.message
      });
      return;
    }

    console.log(`✅ Found ${posts?.length || 0} service posts`);

    res.status(200).json({
      success: true,
      posts: posts || [],
      count: posts?.length || 0
    });

  } catch (error: unknown) {
    console.error('❌ Error in GET /api/service-posts:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ============================================================================
// ENDPOINT 3: GET ALL SERVICE POSTS (PUBLIC)
// ============================================================================
router.get('/api/service-posts/all', async (req: Request, res: Response): Promise<void> => {
  
  try {
    const limit = req.query.limit 
      ? parseInt(req.query.limit as string) 
      : DEFAULT_SEARCH.PAGINATION_LIMIT;
    const offset = req.query.offset 
      ? parseInt(req.query.offset as string) 
      : DEFAULT_SEARCH.PAGINATION_OFFSET;
    const post_type = req.query.post_type as string | undefined;

    console.log('📋 Fetching all service posts');
    console.log(`   Pagination: limit=${limit}, offset=${offset}`);
    if (post_type) {
      console.log(`   Filter: post_type=${post_type}`);
    }

    let query = supabase
      .from('service_posts')
      .select(`
        *,
        users!service_posts_user_id_fkey(
          email,
          business_owners(business_name, average_rating, review_count, accepts_zelle_payment, payment_info, payment_method)
        )
      `, { count: 'exact' })
      .eq('status', POST_STATUS.ACTIVE);

    if (post_type && (post_type === POST_TYPES.OFFER || post_type === POST_TYPES.REQUEST)) {
      query = query.eq('post_type', post_type);
    }

    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    const { data: categoryData } = await supabase
      .from('service_categories')
      .select('category_name, accepts_payment');

    const categoryPaymentMap = new Map(
      (categoryData || []).map((c: any) => [c.category_name, c.accepts_payment ?? false])
    );

    const posts = (data || []).map((post: any) => ({
      ...post,
      post_id: post.id,
      poster_name: post.users?.business_owners?.business_name ||
                   post.users?.email,
      business_name: post.users?.business_owners?.business_name,
      average_rating: post.users?.business_owners?.average_rating || 0,
      review_count: post.users?.business_owners?.review_count || 0,
      accepts_payment: categoryPaymentMap.get(post.service_category) ?? false,
      provider_accepts_zelle: categoryPaymentMap.get(post.service_category) ?? false,
      payment_method: post.users?.business_owners?.payment_method || null,
    }));
    const total = count || 0;

    console.log(`✅ Found ${posts.length} posts (${total} total)`);

    res.json({
      success: true,
      posts: posts,
      total: total,
      limit: limit,
      offset: offset,
      hasMore: (offset + posts.length) < total
    });

  } catch (error: unknown) {
    console.error('❌ Error fetching all service posts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch service posts',
      details: error instanceof Error ? error.message : 'Unknown error'
      
    });
  }
});

// ============================================================================
// ENDPOINT 4: GET SERVICE POSTS BY USER ID (PROTECTED)
// ============================================================================
router.get('/api/service-posts/user/:userId', authenticateToken, authorizeUser, async (req: AuthRequest, res: Response): Promise<void> => {
  
  try {
    const { userId } = req.params;

    console.log('📋 Fetching service posts for user:', userId);

    const { data, error } = await supabase
      .from('service_posts')
      .select(`
        *,
        users!service_posts_user_id_fkey(
          email,
          business_owners(business_name, average_rating, review_count, accepts_zelle_payment, payment_info, payment_method)
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Build accepts_payment map from service_categories
    const uniqueCategories = [...new Set((data || []).map((p: any) => p.service_category).filter(Boolean))];
    let categoryPaymentMap = new Map<string, boolean>();
    if (uniqueCategories.length > 0) {
      const { data: catData } = await supabase
        .from('service_categories')
        .select('category_name, accepts_payment')
        .in('category_name', uniqueCategories);
      categoryPaymentMap = new Map(
        (catData || []).map((c: any) => [c.category_name, c.accepts_payment ?? false])
      );
    }

    const posts = (data || []).map((post: any) => ({
      id: post.id,
      user_id: post.user_id,
      poster_type: post.poster_type,
      post_type: post.post_type,
      title: post.title,
      description: post.description,
      service_category: post.service_category,
      price: post.price,
      phone_number: post.phone_number,
      contact_email: post.contact_email,
      zip_code: post.zip_code,
      city: post.city,
      state: post.state,
      status: post.status,
      created_at: post.created_at,
      updated_at: post.updated_at,
      is_active: post.status === POST_STATUS.ACTIVE,
      in_stock: post.in_stock,
      photos: Array.isArray(post.photos) ? post.photos : [],
      photo_prices: Array.isArray(post.photo_prices) ? post.photo_prices : [],
      photo_quantities: Array.isArray(post.photo_quantities) ? post.photo_quantities : [],
      photo_names: Array.isArray(post.photo_names) ? post.photo_names : [],
      shipping_charge_cents: post.shipping_charge_cents,
      accepts_payment: categoryPaymentMap.get(post.service_category) ?? false,
      poster_name: post.users?.business_owners?.business_name || post.users?.email,
      business_name: post.users?.business_owners?.business_name,
      average_rating: post.users?.business_owners?.average_rating || 0,
      review_count: post.users?.business_owners?.review_count || 0
    }));

    console.log(`✅ Found ${posts.length} posts for user ${userId}`);

    res.json({
      success: true,
      posts: posts,
      total: posts.length
    });

  } catch (error: unknown) {
    console.error('❌ Error fetching user service posts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user service posts',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ============================================================================
// ENDPOINT 5: CREATE NEW SERVICE POST (PROTECTED)
// ============================================================================
router.post('/api/service-posts', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  
  try {
    const {
      user_id,
      poster_type,
      post_type,
      title,
      description,
      service_category,
      price,
      delivery_timeline,
      phone_number,
      contact_email,
      zip_code,
      in_stock,
      shipping_charge_cents,
      post_payment_method,
      post_payment_info,
    } = req.body;

    console.log('📝 Creating new service post');
    console.log(`   User: ${user_id}, Title: "${title}", Category: ${service_category}`);

    if (!user_id || !poster_type || !post_type || !title || !service_category || !contact_email) {
      console.error('❌ Missing required fields');
      res.status(400).json({
        success: false,
        error: 'Missing required fields: user_id, poster_type, post_type, title, service_category, contact_email'
      });
      return;
    }

    console.log('🔒 Create post authorization check:');
    console.log('  Requested user_id:', user_id, `(type: ${typeof user_id})`);
    console.log('  Authenticated user_id:', req.user?.user_id, `(type: ${typeof req.user?.user_id})`);
    console.log('  Match?', String(user_id) === String(req.user?.user_id));
    
    if (String(user_id) !== String(req.user?.user_id)) {
      console.log('❌ Authorization failed - user_id mismatch');
      res.status(403).json({
        success: false,
        error: 'You can only create posts for yourself'
      });
      return;
    }
    console.log('✅ Authorization passed - user can create post');

    if (post_type !== POST_TYPES.OFFER && post_type !== POST_TYPES.REQUEST) {
      console.error('❌ Invalid post_type:', post_type);
      res.status(400).json({
        success: false,
        error: `Invalid post_type. Must be either "${POST_TYPES.OFFER}" or "${POST_TYPES.REQUEST}"`
      });
      return;
    }

    let city: string | null = null;
    let state: string | null = null;

    if (zip_code) {
      try {
        console.log(`   📍 Looking up location for ZIP ${zip_code}...`);
        const location = await getZipLocation(zip_code);
        if (location) {
          city = location.city;
          state = location.state;
          console.log(`   ✅ Location: ${city}, ${state}`);
        }
      } catch (zipError) {
        console.warn('   ⚠️ Could not fetch location data for zip code:', zip_code);
      }
    }

    // [2026-07-14] Fallback: if ZIP lookup failed (e.g. ZIP not in zippopotam.us database),
    // use city/state from the seller's registration profile. This handles cases like ZIP 75036
    // (Frisco TX) where the seller manually entered city/state during signup.
    if (!city || !state) {
      const { data: bizData } = await supabase
        .from('business_owners')
        .select('city, state')
        .eq('user_id', user_id)
        .single();
      if (bizData?.city) city = bizData.city;
      if (bizData?.state) state = bizData.state;
      if (city) console.log(`   📍 Location from profile: ${city}, ${state}`);
    }

    const { data: newPost, error } = await supabase
      .from('service_posts')
      .insert([{
        user_id,
        poster_type,
        post_type,
        title,
        description,
        service_category,
        price,
        delivery_timeline,
        phone_number,
        contact_email,
        zip_code,
        city,
        state,
        status: POST_STATUS.ACTIVE,
        request_status: post_type === 'request' ? 'pending' : null,
        in_stock: in_stock !== undefined ? in_stock : 1,
        // [2026-08-03] [feature/per-photo-inventory] Was `|| null` — 0 is falsy in JS, so
        // an explicit $0.00 shipping charge got nulled out at creation, which downstream
        // `?? 1000` fallbacks then treated as "not set" and defaulted to $10.00. Switched
        // to `??` to preserve 0.
        shipping_charge_cents: shipping_charge_cents ?? null,
        post_payment_method: post_payment_method || null,
        post_payment_info: post_payment_info || null,
      }])
      .select()
      .single();

    if (error) throw error;

    console.log('✅ Service post created successfully with ID:', newPost.id);

   // ✅ SEND EMAIL TO ADMIN IF THIS IS A CATEGORY REQUEST
if (post_type === 'request' && title.includes('[CATEGORY REQUEST]')) {
  try {
    console.log('📧 This is a category request, notifying admin...');
    
    // Get admin email from database (get first admin if multiple exist)
    const { data: adminUsers } = await supabase
      .from('users')
      .select('email')
      .eq('is_admin', true)
      .limit(1);

    const adminUser = adminUsers?.[0];

    if (adminUser?.email) {
      // Get user details for email
      const { data: userData } = await supabase
        .from('users')
        .select('email, business_owners(business_name)')
        .eq('user_id', user_id)
        .single();

      const userName = userData?.business_owners?.[0]?.business_name || 'User';
      const categoryName = title.replace('[CATEGORY REQUEST]', '').trim();

      await sendCategoryRequestNotification({
        adminEmail: adminUser.email,
        userName,
        userEmail: contact_email,
        categoryName,
        requestId: newPost.id,
        justification: description
      });

      console.log('✅ Admin notification sent successfully');
    } else {
      console.warn('⚠️ No admin user found in database');
    }
  } catch (emailError) {
    console.error('⚠️ Failed to notify admin (non-blocking):', emailError);
    // Don't fail the request creation if email fails
  }
}
    // ✅ Notify admin of every new service post (non-blocking)
    if (!(post_type === 'request' && title.includes('[CATEGORY REQUEST]'))) {
      (async () => {
        try {
          const { data: adminUsers } = await supabase
            .from('users').select('email').eq('is_admin', true).limit(1);
          const adminEmail = adminUsers?.[0]?.email;
          if (!adminEmail) return;

          const { data: posterData } = await supabase
            .from('users')
            .select('email, full_name')
            .eq('user_id', user_id)
            .single();
          const { data: bizData } = await supabase
            .from('business_owners')
            .select('business_name')
            .eq('user_id', user_id)
            .single();

          await sendNewPostNotification({
            adminEmail,
            posterName:    bizData?.business_name || posterData?.full_name || 'Unknown',
            posterEmail:   posterData?.email || contact_email || '',
            postTitle:     title,
            postCategory:  service_category,
            postType:      post_type,
            price:         price || undefined,
            zipCode:       zip_code || undefined,
            city:          city || undefined,
            state:         state || undefined,
            postId:        newPost.id,
          });
        } catch (e) {
          console.error('⚠️ Failed to send new post admin notification:', e);
        }
      })();
    }

    res.status(201).json({
      success: true,
      post: newPost,
      message: 'Service post created successfully'
    });

  } catch (error: unknown) {
    console.error('❌ Error creating service post:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create service post',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ============================================================================
// ENDPOINT 6: GET SINGLE SERVICE POST BY ID (PUBLIC)
// ============================================================================
router.get('/api/service-posts/:postId', async (req: Request, res: Response): Promise<void> => {
  
  try {
    const { postId } = req.params;

    console.log('📋 Fetching service post:', postId);

    const { data, error } = await supabase
      .from('service_posts')
      .select(`
        *,
        users!service_posts_user_id_fkey(
          email,
          business_owners(business_name, average_rating, review_count, accepts_zelle_payment, payment_info, payment_method)
        )
      `)
      .eq('id', postId)
      .single();

    if (error) {
      if (error.code === SUPABASE_ERROR.NOT_FOUND) {
        res.status(404).json({
          success: false,
          error: 'Service post not found'
        });
        return;
      }
      throw error;
    }

    // Build sold_photo_indexes:
    //   completed orders  → permanently sold, always show as Sold
    //   pending orders    → reserved (not yet expired), show as Sold
    //   expired/cancelled → available again, exclude
    const now12hAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const [
      { data: completedOrders },   // permanently sold
      { data: pendingByDate },     // reserved with valid expires_at
      { data: pendingNullExpiry }, // reserved, expires_at NULL but < 1h old
    ] = await Promise.all([
      supabase.from('payments').select('items').eq('status', 'completed'),
      supabase.from('payments').select('items').eq('status', 'pending').gt('expires_at', new Date().toISOString()),
      supabase.from('payments').select('items').eq('status', 'pending').is('expires_at', null).gt('created_at', now12hAgo),
    ]);
    const activeOrders = [
      ...(completedOrders  || []),
      ...(pendingByDate    || []),
      ...(pendingNullExpiry || []),
    ];

    const soldPhotoIndexes: number[] = [];
    // [2026-08-03] [feature/per-photo-inventory] Sum of quantity purchased so far per
    // photo index, across the same completed/pending order set used for
    // soldPhotoIndexes above — feeds photo_remaining_qty below so a photo with e.g. qty
    // 100 doesn't go "sold" after being bought once. sold_photo_indexes (boolean) is
    // left untouched for callers that still rely on it (e.g. thrifting, where each
    // photo is a 1-of-1 item).
    const purchasedQtyByIndex = new Map<number, number>();
    for (const order of activeOrders || []) {
      for (const orderItem of (order.items || [])) {
        if (Number(orderItem.post_id) === Number(postId) && orderItem.photo_index != null) {
          const idx = Number(orderItem.photo_index);
          soldPhotoIndexes.push(idx);
          const qty = Number(orderItem.quantity ?? 1);
          purchasedQtyByIndex.set(idx, (purchasedQtyByIndex.get(idx) ?? 0) + qty);
        }
      }
    }
    const photoRemainingQty: number[] = (data.photos || []).map((_: any, idx: number) => {
      const totalQty = Number((data.photo_quantities ?? [])[idx] ?? 1);
      const purchased = purchasedQtyByIndex.get(idx) ?? 0;
      return Math.max(totalQty - purchased, 0);
    });

    // For thrifting posts, fetch which photo_indexes have at least one active request
    // so the buyer modal can show Available / Pending Request / Unavailable badges
    let thriftPendingIndexes: number[] = [];
    if (data.service_category === 'Preloved & Thrifting') {
      const { data: pendingRows } = await supabase
        .from('thrift_requests')
        .select('photo_index')
        .eq('post_id', postId)
        .eq('status', 'requested')
        .not('photo_index', 'is', null);
      if (pendingRows) {
        thriftPendingIndexes = [...new Set(pendingRows.map((r: any) => Number(r.photo_index)))];
      }
    }

    const mergedSoldIndexes = [...new Set([...soldPhotoIndexes, ...(data.sold_photo_indexes ?? [])])];

    const post = {
      ...data,
      post_id: data.id,
      poster_name: data.users?.business_owners?.business_name ||
                   data.users?.email,
      business_name: data.users?.business_owners?.business_name,
      average_rating: data.users?.business_owners?.average_rating || 0,
      review_count: data.users?.business_owners?.review_count || 0,
      // Merge boutique sold indexes (from payments) + thrift completed indexes (from service_posts column)
      sold_photo_indexes: mergedSoldIndexes,
      // Photos with at least one active thrift request (for badge display)
      thrift_pending_indexes: thriftPendingIndexes,
    };

    console.log('✅ Found service post:', post.id, '| sold:', post.sold_photo_indexes, '| pending:', post.thrift_pending_indexes);

    res.json({
      success: true,
      post: post
    });

  } catch (error: unknown) {
    console.error('❌ Error fetching service post:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch service post',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ============================================================================
// ENDPOINT 7: UPDATE SERVICE POST (PROTECTED)
// ============================================================================
router.put('/api/service-posts/:postId', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  
  try {
    const { postId } = req.params;
    const {
      title,
      description,
      service_category,
      price,
      delivery_timeline,
      phone_number,
      contact_email,
      zip_code,
      post_type,
      in_stock,
      shipping_charge_cents,
      post_payment_method,
      post_payment_info,
    } = req.body;

    console.log('🔄 Updating service post:', postId);
    console.log('   Updated fields:', Object.keys(req.body).join(', '));

    if (!title || !service_category || !contact_email) {
      console.error('❌ Missing required fields');
      res.status(400).json({
        success: false,
        error: 'Missing required fields: title, service_category, contact_email'
      });
      return;
    }

    const { data: existingPost, error: fetchError } = await supabase
      .from('service_posts')
      .select('user_id')
      .eq('id', postId)
      .single();

    if (fetchError || !existingPost) {
      res.status(404).json({
        success: false,
        error: 'Service post not found'
      });
      return;
    }

    console.log('🔒 Update authorization check:');
    console.log('  Post owner user_id:', existingPost.user_id, `(type: ${typeof existingPost.user_id})`);
    console.log('  Authenticated user_id:', req.user?.user_id, `(type: ${typeof req.user?.user_id})`);
    console.log('  Match?', String(existingPost.user_id) === String(req.user?.user_id));

    if (String(existingPost.user_id) !== String(req.user?.user_id)) {
      console.log('❌ Authorization failed - not post owner');
      res.status(403).json({
        success: false,
        error: 'You can only update your own posts'
      });
      return;
    }
    console.log('✅ Authorization passed - user can update post');
    
    let city: string | null = null;
    let state: string | null = null;

    if (zip_code) {
      try {
        console.log(`   📍 Looking up updated location for ZIP ${zip_code}...`);
        const location = await getZipLocation(zip_code);
        if (location) {
          city = location.city;
          state = location.state;
          console.log(`   ✅ Updated location: ${city}, ${state}`);
        }
      } catch (zipError) {
        console.warn('   ⚠️ Could not fetch location data for zip code:', zip_code);
      }
    }

    // [2026-07-14] Fallback: if ZIP lookup failed, use city/state from seller's profile.
    // Same logic as post creation — handles ZIPs not in zippopotam.us.
    if (!city || !state) {
      const { data: bizData } = await supabase
        .from('business_owners')
        .select('city, state')
        .eq('user_id', req.user?.user_id)
        .single();
      if (bizData?.city) city = bizData.city;
      if (bizData?.state) state = bizData.state;
      if (city) console.log(`   📍 Location from profile: ${city}, ${state}`);
    }

    const { data: updatedPost, error } = await supabase
      .from('service_posts')
      .update({
        title,
        description,
        service_category,
        price,
        delivery_timeline,
        phone_number,
        contact_email,
        zip_code,
        city,
        state,
        post_type,
        ...(in_stock !== undefined && { in_stock }),
        ...(shipping_charge_cents !== undefined && { shipping_charge_cents }),
        ...(post_payment_method !== undefined && { post_payment_method }),
        ...(post_payment_info !== undefined && { post_payment_info }),
        updated_at: new Date().toISOString()
      })
      .eq('id', postId)
      .select()
      .single();

    if (error) {
      if (error.code === SUPABASE_ERROR.NOT_FOUND) {
        res.status(404).json({
          success: false,
          error: 'Service post not found'
        });
        return;
      }
      throw error;
    }

    console.log('✅ Service post updated successfully');

    res.json({
      success: true,
      post: updatedPost,
      message: 'Service post updated successfully'
    });

  } catch (error: unknown) {
    console.error('❌ Error updating service post:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update service post',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ============================================================================
// ENDPOINT 8: DELETE SERVICE POST (PROTECTED)
// ============================================================================
router.delete('/api/service-posts/:postId', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  
  try {
    const { postId } = req.params;

    console.log('🗑️ Permanently deleting service post:', postId);

    const { data: existingPost, error: fetchError } = await supabase
      .from('service_posts')
      .select('user_id')
      .eq('id', postId)
      .single();

    if (fetchError || !existingPost) {
      res.status(404).json({
        success: false,
        error: 'Service post not found'
      });
      return;
    }

    console.log('🔒 Delete authorization check:');
    console.log('  Post owner user_id:', existingPost.user_id, `(type: ${typeof existingPost.user_id})`);
    console.log('  Authenticated user_id:', req.user?.user_id, `(type: ${typeof req.user?.user_id})`);
    console.log('  Match?', String(existingPost.user_id) === String(req.user?.user_id));

    if (String(existingPost.user_id) !== String(req.user?.user_id)) {
      console.log('❌ Authorization failed - not post owner');
      res.status(403).json({
        success: false,
        error: 'You can only delete your own posts'
      });
      return;
    }
    console.log('✅ Authorization passed - user can delete post');

    const { error } = await supabase
      .from('service_posts')
      .delete()
      .eq('id', postId);

    if (error) {
      if (error.code === SUPABASE_ERROR.NOT_FOUND) {
        res.status(404).json({
          success: false,
          error: 'Service post not found'
        });
        return;
      }
      throw error;
    }

    console.log('✅ Service post permanently deleted');

    res.json({
      success: true,
      message: 'Service post deleted successfully'
    });

  } catch (error: unknown) {
    console.error('❌ Error deleting service post:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete service post',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ============================================================================
// ENDPOINT 9: INACTIVATE SERVICE POST (PROTECTED)
// ============================================================================
router.patch('/api/service-posts/:postId/inactivate', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  
  try {
    const { postId } = req.params;

    console.log('🔒 Inactivating (soft delete) service post:', postId);

    const { data: existingPost, error: fetchError } = await supabaseAdmin
      .from('service_posts')
      .select('user_id')
      .eq('id', postId)
      .single();

    if (fetchError || !existingPost) {
      res.status(404).json({
        success: false,
        error: 'Service post not found'
      });
      return;
    }

    console.log('🔒 Inactivate authorization check:');
    console.log('  Post owner user_id:', existingPost.user_id, `(type: ${typeof existingPost.user_id})`);
    console.log('  Authenticated user_id:', req.user?.user_id, `(type: ${typeof req.user?.user_id})`);
    console.log('  Match?', String(existingPost.user_id) === String(req.user?.user_id));

    if (String(existingPost.user_id) !== String(req.user?.user_id)) {
      console.log('❌ Authorization failed - not post owner');
      res.status(403).json({
        success: false,
        error: 'You can only inactivate your own posts'
      });
      return;
    }
    console.log('✅ Authorization passed - user can inactivate post');
  
    const { data: inactivatedPost, error } = await supabaseAdmin  
      .from('service_posts')
      .update({
        status: POST_STATUS.CLOSED,
        updated_at: new Date().toISOString()
      })
      .eq('id', postId)
      .select()
      .single();

    if (error) {
      if (error.code === SUPABASE_ERROR.NOT_FOUND) {
        res.status(404).json({
          success: false,
          error: 'Service post not found'
        });
        return;
      }
      throw error;
    }

    console.log('✅ Service post inactivated (status set to closed)');

    res.json({
      success: true,
      post: inactivatedPost,
      message: 'Service post inactivated successfully'
    });

  } catch (error: unknown) {
    console.error('❌ Error inactivating service post:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to inactivate service post',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});
// ============================================================================
// ENDPOINT 10: ADMIN APPROVE/REJECT CATEGORY REQUEST (PROTECTED)
// ============================================================================
import { sendCategoryRequestDecision } from '../services/emailServices';

router.patch('/api/service-posts/category-request/:requestId/status', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { requestId } = req.params;
    const { request_status, admin_notes } = req.body;

    console.log(`📝 Updating category request ${requestId} to: ${request_status}`);

    // ✅ Check if user is admin
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('is_admin')
      .eq('user_id', req.user?.user_id)
      .single();

    if (userError || !user?.is_admin) {
      console.log('❌ Access denied - not an admin');
      res.status(403).json({
        success: false,
        error: 'Admin access required. Only authorized admins can approve/reject category requests.'
      });
      return;
    }
    
    console.log('✅ Admin check passed');
    
    if (!['approved', 'rejected'].includes(request_status)) {
      res.status(400).json({
        success: false,
        error: 'Invalid status. Must be "approved" or "rejected"'
      });
      return;
    }
// Verify it's a category request
    const { data: existingPost, error: fetchError } = await supabase
      .from('service_posts')
      .select('post_type, title, user_id, contact_email, description')
      .eq('id', requestId)
      .single();

    if (fetchError || !existingPost) {
      res.status(404).json({
        success: false,
        error: 'Category request not found'
      });
      return;
    }

    if (existingPost.post_type !== 'request' || !existingPost.title.startsWith('[CATEGORY REQUEST]')) {
      res.status(400).json({
        success: false,
        error: 'This is not a category request'
      });
      return;
    }

    // Extract category name from title
    const categoryName = existingPost.title.replace('[CATEGORY REQUEST]', '').trim();

    // Build updated description with admin notes
    let updatedDescription = existingPost.description;
    if (admin_notes) {
      updatedDescription = `${existingPost.description}\n\n--- Admin Response ---\n${admin_notes}`;
    }

    // Update status
    const { data: updatedPost, error } = await supabase
      .from('service_posts')
      .update({
        request_status: request_status,
        description: updatedDescription,
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId)
      .select()
      .single();

    if (error) throw error;

    // ✅ Fetch user details separately for email
    const { data: userData } = await supabase
      .from('users')
      .select('email, business_owners(business_name)')
      .eq('user_id', existingPost.user_id)
      .single();

    // ✅ Send email notification to user
    const userEmail = userData?.email || existingPost.contact_email;
    const userName = userData?.business_owners?.[0]?.business_name || 'User';

    if (userEmail) {
      try {
        const emailResult = await sendCategoryRequestDecision({
          userEmail,
          userName,
          categoryName,
          requestStatus: request_status,
          adminNotes: admin_notes
        });

        console.log('📧 Email notification result:', emailResult);
      } catch (emailError) {
        console.error('⚠️ Email send failed (non-blocking):', emailError);
        // Don't fail the approval/rejection if email fails
      }
    }

    console.log(`✅ Category request ${request_status} and email sent`);

    res.json({
      success: true,
      post: updatedPost,
      message: `Category request ${request_status} successfully`
    });

  } catch (error: unknown) {
    console.error('❌ Error updating category request status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update category request status',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});
// ============================================================================
// PHOTO UPLOAD ROUTES - AUTO-CONVERT HEIC TO JPEG
// ADD THIS CODE BEFORE: export default router;
// ============================================================================

// Configuration
const ACCEPTED_FORMATS = [
  'image/jpeg',
  'image/png', 
  'image/webp',
  'image/heic',
  'image/heif'
];

const OUTPUT_FORMATS: { [key: string]: string } = {
  'image/jpeg': 'jpeg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'jpeg',
  'image/heif': 'jpeg'
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_PHOTOS_FREE = 5;
const MAX_PHOTOS_PREMIUM = 10;

// Multer configuration
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
  fileFilter: (req, file, cb) => {
    console.log('📸 Received file:', {
      name: file.originalname,
      type: file.mimetype,
      size: `${(file.size / 1024).toFixed(2)} KB`
    });

    if (!ACCEPTED_FORMATS.includes(file.mimetype)) {
      console.error('❌ Unsupported format:', file.mimetype);
      return cb(new Error(`Unsupported image format: ${file.mimetype}`));
    }

    console.log('✅ File format accepted');
    cb(null, true);
  },
});
// ============================================================================
// CORRECTED HEIC CONVERSION FUNCTION
// Replace the existing convertHeicToJpeg function with this version
// ============================================================================
// HEIC to JPEG conversion helper
async function convertHeicToJpeg(buffer: Buffer): Promise<Buffer> {
  console.log('🔄 Converting HEIC to JPEG...');
  
  try {
    // Convert Buffer to Uint8Array, then get its ArrayBuffer
    const inputArray = new Uint8Array(buffer);
    
    // COMPRESSION STEP 1 (iPhone photos only):
    // heic-convert converts HEIC → JPEG at 90% quality.
    // Must run before sharp because sharp cannot natively decode HEIC.
    // The result is then passed to the sharp pipeline below (Step 2).
    const outputBuffer = await heicConvert({
      buffer: inputArray.buffer,
      format: 'JPEG',
      quality: 0.9,
    });

    // Convert ArrayBuffer back to Buffer
    const resultBuffer = Buffer.from(new Uint8Array(outputBuffer as ArrayBuffer));

    console.log('✅ HEIC conversion successful:', {
      originalSize: `${(buffer.length / 1024).toFixed(2)} KB`,
      convertedSize: `${(resultBuffer.length / 1024).toFixed(2)} KB`
    });

    return resultBuffer;
  } catch (error) {
    console.error('❌ HEIC conversion failed:', error);
    throw new Error('Failed to convert HEIC image. Please try a different photo.');
  }
}
// ============================================================================
// ENDPOINT 11: UPLOAD PHOTO - SUPPORTS BASE64 (WEB) AND FORMDATA (MOBILE)
// ============================================================================
// AFTER
// AFTER
interface AuthenticatedRequest extends AuthRequest {
  file?: any;
}

router.post(
  '/api/service-posts/:postId/upload-photo',
  authenticateToken,
  (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // Check if it's JSON (base64) or FormData (mobile)
    const contentType = req.headers['content-type'] || '';
    
    if (contentType.includes('application/json')) {
      // Base64 upload from web - skip multer
      console.log('📦 Detected JSON body - Base64 upload');
      next();
    } else {
      // FormData upload from mobile - use multer
      console.log('📱 Detected FormData - Mobile upload');
      upload.single('photo')(req, res, next);
    }
  },
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { postId } = req.params;
      const userId = req.user?.user_id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      // Determine photo limit based on user's subscription tier
      const { data: userTier } = await supabase
        .from('users')
        .select('is_premium')
        .eq('user_id', userId)
        .single();
      const MAX_PHOTOS_PER_POST = userTier?.is_premium ? MAX_PHOTOS_PREMIUM : MAX_PHOTOS_FREE;

      console.log('📸 Processing upload for post:', postId);

      // Verify post ownership
      const { data: post, error: postError } = await supabase
        .from('service_posts')
        .select('user_id, photos, photo_prices, photo_quantities, photo_names')
        .eq('id', postId)
        .single();

      if (postError || !post) {
        res.status(404).json({ error: 'Service post not found' });
        return;
      }

      if (String(post.user_id) !== String(userId)) {
        res.status(403).json({ error: 'You can only upload photos to your own posts' });
        
        return;
      }

      const currentPhotos = post.photos || [];
      if (currentPhotos.length >= MAX_PHOTOS_PER_POST) {
        res.status(400).json({ 
          error: `Maximum ${MAX_PHOTOS_PER_POST} photos allowed per post` 
        });
        return;
      }

      let fileBuffer: Buffer;
      let fileName: string;
      let mimeType: string;

      // ============================================================
      // HANDLE BASE64 UPLOAD (WEB)
      // ============================================================
      if (req.body.photo && typeof req.body.photo === 'string') {
        console.log('📦 Processing Base64 upload from web');
        
        // Strip data URL prefix if present (e.g. "data:image/jpeg;base64,...")
        // Without this, the prefix gets decoded as base64 producing a corrupted buffer
        const base64Data = req.body.photo.includes(',')
          ? req.body.photo.split(',')[1]
          : req.body.photo;
        fileBuffer = Buffer.from(base64Data, 'base64');
        fileName = req.body.filename || `photo_${Date.now()}.jpg`;
        mimeType = req.body.mimetype || 'image/jpeg';

        // [2026-07-14] Added filename to log so Render logs show which photo index/retry reached the server
        console.log('✅ Base64 decoded:', Math.round(fileBuffer.length / 1024), 'KB', '| file:', fileName);
      }
      // ============================================================
      // HANDLE FORMDATA UPLOAD (MOBILE)
      // ============================================================
      else if (req.file) {
        console.log('📱 Processing FormData upload from mobile');
        
        fileBuffer = req.file.buffer;
        fileName = `photo_${Date.now()}.${req.file.mimetype.split('/')[1]}`;
        mimeType = req.file.mimetype;
      } else {
        res.status(400).json({ error: 'No photo provided' });
        return;
      }

      // Check file size (10MB limit)
      if (fileBuffer.length > MAX_FILE_SIZE) {
        res.status(400).json({ error: 'File too large (max 10MB)' });
        return;
      }

      // ============================================================
// DETECT REAL FILE TYPE FROM MAGIC BYTES
// iOS Safari sometimes reports image/jpeg for HEIC files — detect from
// the actual buffer content so the HEIC conversion step isn't skipped.
// HEIC files use an ISO Base Media File Format container: bytes 4-7 = "ftyp"
// ============================================================
const ftypSignature = Buffer.from('ftyp');
const isActuallyHeic = fileBuffer.length > 12 && fileBuffer.indexOf(ftypSignature, 4) === 4;
if (isActuallyHeic && mimeType === 'image/jpeg') {
  console.warn('⚠️ Browser reported image/jpeg but magic bytes indicate HEIC — correcting mimeType');
  mimeType = 'image/heic';
}

      // ============================================================
// CONVERT HEIC TO JPEG IF NEEDED
// ============================================================
if (mimeType === 'image/heic' || mimeType === 'image/heif') {
  try {
    fileBuffer = await convertHeicToJpeg(fileBuffer);
    fileName = fileName.replace(/\.(heic|heif)$/i, '.jpg');
    mimeType = 'image/jpeg';
    console.log('✅ HEIC converted to JPEG');
  } catch (conversionError) {
    console.error('❌ HEIC conversion failed:', conversionError);
    res.status(500).json({ error: 'Please convert your photo to JPEG or PNG before uploading. HEIC format is not supported.' });
    return;
  }
}

// ============================================================
// COMPRESSION STEP 2 — sharp resize + quality reduction (ALL photos)
// Runs for every upload: JPEG, PNG, WebP, and HEIC (after Step 1 converts it).
// - .rotate()         : reads EXIF orientation and bakes it in (fixes sideways photos on desktop web)
// - .resize(800,800)  : shrinks to max 800px on longest side, preserves aspect ratio, never upscales
// - .jpeg({quality70}): re-encodes as JPEG at 70% — strips all EXIF metadata, ~3-10x smaller file
// Original implementation was 1200px/80%; reduced here to cut Supabase storage costs.
// ============================================================
try {
  const originalSize = fileBuffer.length;
  let compressed: Buffer | null = null;

  // Attempt 1: with .rotate() to fix EXIF orientation
  try {
    compressed = await sharp(fileBuffer)
      .rotate()
      .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 70 })
      .toBuffer();
  } catch {
    // Attempt 2: without .rotate() — some images cause "bad seek" during EXIF read
    try {
      compressed = await sharp(fileBuffer)
        .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 70 })
        .toBuffer();
      console.warn('⚠️ Compressed without EXIF rotation (rotate() failed)');
    } catch (fallbackError) {
      console.error('⚠️ Compression failed entirely, using original:', fallbackError);
    }
  }

  if (compressed) {
    fileBuffer = compressed;
    mimeType = 'image/jpeg';
    fileName = fileName.replace(/\.(png|webp|heic|heif)$/i, '.jpg');
    console.log(`✅ Image compressed: ${Math.round(originalSize / 1024)}KB → ${Math.round(fileBuffer.length / 1024)}KB`);
  }
} catch (outerError) {
  console.error('⚠️ Compression setup failed, using original:', outerError);
}

      // ============================================================
      // UPLOAD TO SUPABASE STORAGE
      // ============================================================
      const filePath = `${userId}/${uuidv4()}.${fileName.split('.').pop()}`;
      
      console.log('📁 Uploading to Supabase:', filePath);
      
      const { error: uploadError } = await supabase.storage
        .from('service-photos')
        .upload(filePath, fileBuffer, {
          contentType: mimeType,
          upsert: false
        });

      if (uploadError) {
        console.error('❌ Supabase upload error:', uploadError);
        // [2026-07-14] Alert admin when server-side photo upload fails
        sendAdminAlert(
          `Photo upload failed — post ${req.params.postId}`,
          `File: ${fileName}\nUser: ${userId}\nPost: ${req.params.postId}\nError: ${uploadError.message}\nTime: ${new Date().toISOString()}`
        ).catch(() => {});
        res.status(500).json({ error: 'Failed to upload photo to storage' });
        return;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('service-photos')
        .getPublicUrl(filePath);

      const photoUrl = urlData.publicUrl;
      console.log('✅ Photo uploaded:', photoUrl);

      // ============================================================
      // UPDATE DATABASE
      // ============================================================
      const price = parseFloat(req.body.price) || 0;
      // [2026-08-03] [feature/per-photo-inventory] Per-photo quantity/name — each photo
      // is its own product with its own stock, independent of the post-level in_stock
      // and every other photo.
      const quantity = parseInt(req.body.quantity, 10) || 1;
      const name = (req.body.name || req.body.description || '').toString().trim();

      const updatedPhotos = [...currentPhotos, photoUrl];
      const updatedPrices = [...(post.photo_prices || []), price];
      const updatedQuantities = [...(post.photo_quantities || []), quantity];
      const updatedNames = [...(post.photo_names || []), name];

      const { error: updateError } = await supabase
        .from('service_posts')
        .update({
          photos: updatedPhotos,
          photo_prices: updatedPrices,
          photo_quantities: updatedQuantities,
          photo_names: updatedNames,
        })
        .eq('id', postId);

      if (updateError) {
        console.error('❌ Database update error:', updateError);
        // Cleanup uploaded file
        await supabase.storage.from('service-photos').remove([filePath]);
        res.status(500).json({ error: 'Failed to save photo reference' });
        return;
      }

      console.log('✅ Photo upload complete');

      res.status(200).json({
        success: true,
        photoUrl: photoUrl,
        totalPhotos: updatedPhotos.length
      });

    } catch (error: any) {
      console.error('❌ Photo upload error:', error);
      res.status(500).json({ 
        error: error.message || 'Failed to upload photo' 
      });
    }
  }
);


// ============================================================================
// ENDPOINT 12: DELETE PHOTO (PROTECTED)
// ============================================================================
router.delete(
  '/api/service-posts/:postId/photos/:photoIndex',
  authenticateToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { postId, photoIndex } = req.params;
      const index = parseInt(photoIndex);

      console.log(`🗑️ Deleting photo ${index} from post ${postId}`);

      const { data: post, error: fetchError } = await supabase
        .from('service_posts')
        .select('user_id, photos, photo_prices, photo_quantities, photo_names')
        .eq('id', postId)
        .single();

      if (fetchError || !post) {
        res.status(404).json({
          success: false,
          error: 'Service post not found',
        });
        return;
      }

      if (String(post.user_id) !== String(req.user?.user_id)) {
        res.status(403).json({
          success: false,
          error: 'You can only delete photos from your own posts',
        });
        return;
      }

      if (!post.photos || post.photos.length === 0) {
        res.status(404).json({
          success: false,
          error: 'No photos on this post',
        });
        return;
      }

      if (index < 0 || index >= post.photos.length) {
        res.status(400).json({
          success: false,
          error: 'Invalid photo index',
        });
        return;
      }

      const photoUrl = post.photos[index];
      const urlParts = photoUrl.split('/service-photos/');
      
      if (urlParts.length < 2) {
        res.status(400).json({
          success: false,
          error: 'Invalid photo URL',
        });
        return;
      }
      
      const filePath = urlParts[1];

      const { error: storageError } = await supabase.storage
        .from('service-photos')
        .remove([filePath]);

      if (storageError) {
        console.warn('⚠️ Storage deletion warning:', storageError);
      }

      const updatedPhotos = post.photos.filter((_: any, i: number) => i !== index);
      const updatedPrices = (post.photo_prices || []).filter((_: any, i: number) => i !== index);
      const updatedQuantities = (post.photo_quantities || []).filter((_: any, i: number) => i !== index);
      const updatedNames = (post.photo_names || []).filter((_: any, i: number) => i !== index);

      const { error: updateError } = await supabase
        .from('service_posts')
        .update({
          photos: updatedPhotos.length > 0 ? updatedPhotos : null,
          photo_prices: updatedPrices,
          photo_quantities: updatedQuantities,
          photo_names: updatedNames,
        })
        .eq('id', postId);

      if (updateError) {
        console.error('❌ Database update error:', updateError);
        res.status(500).json({
          success: false,
          error: 'Failed to update post',
        });
        return;
      }

      console.log('✅ Photo deleted');

      res.status(200).json({
        success: true,
        message: 'Photo deleted successfully',
        remainingPhotos: updatedPhotos,
      });

    } catch (error: unknown) {
      console.error('❌ Photo deletion error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete photo',
      });
    }
  }
);

// ============================================================================
// ENDPOINT 13: EDIT AN ALREADY-UPLOADED PHOTO'S PRICE/QUANTITY/NAME (PROTECTED)
// [2026-08-03] [feature/per-photo-inventory] Previously impossible — sellers could only
// add/remove photos, never re-price or re-stock one already on the post.
// ============================================================================
router.patch(
  '/api/service-posts/:postId/photos/:photoIndex',
  authenticateToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { postId, photoIndex } = req.params;
      const index = parseInt(photoIndex);
      const { price, quantity, name } = req.body;

      const { data: post, error: fetchError } = await supabase
        .from('service_posts')
        .select('user_id, photos, photo_prices, photo_quantities, photo_names')
        .eq('id', postId)
        .single();

      if (fetchError || !post) {
        res.status(404).json({ success: false, error: 'Service post not found' });
        return;
      }

      if (String(post.user_id) !== String(req.user?.user_id)) {
        res.status(403).json({ success: false, error: 'You can only edit photos on your own posts' });
        return;
      }

      if (!post.photos || index < 0 || index >= post.photos.length) {
        res.status(400).json({ success: false, error: 'Invalid photo index' });
        return;
      }

      const updatedPrices = [...(post.photo_prices || [])];
      const updatedQuantities = [...(post.photo_quantities || [])];
      const updatedNames = [...(post.photo_names || [])];
      // Pad arrays that predate photo_quantities/photo_names so the index write below is safe.
      while (updatedPrices.length < post.photos.length) updatedPrices.push(0);
      while (updatedQuantities.length < post.photos.length) updatedQuantities.push(1);
      while (updatedNames.length < post.photos.length) updatedNames.push('');

      if (price !== undefined) updatedPrices[index] = parseFloat(price) || 0;
      if (quantity !== undefined) updatedQuantities[index] = parseInt(quantity, 10) || 1;
      if (name !== undefined) updatedNames[index] = String(name).trim();

      const { error: updateError } = await supabase
        .from('service_posts')
        .update({
          photo_prices: updatedPrices,
          photo_quantities: updatedQuantities,
          photo_names: updatedNames,
        })
        .eq('id', postId);

      if (updateError) {
        console.error('❌ Database update error:', updateError);
        res.status(500).json({ success: false, error: 'Failed to update photo' });
        return;
      }

      res.status(200).json({
        success: true,
        price: updatedPrices[index],
        quantity: updatedQuantities[index],
        name: updatedNames[index],
      });
    } catch (error: unknown) {
      console.error('❌ Photo edit error:', error);
      res.status(500).json({ success: false, error: 'Failed to edit photo' });
    }
  }
);

export default router;