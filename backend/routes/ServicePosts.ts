/**
 * ============================================================================
 * SERVICE POSTS ROUTES
 * ============================================================================
 * 
 * Last Updated: January 9, 2026
 * Changes: 
 * - Added JWT authentication to protect sensitive endpoints and user data
 * - FIXED: Type comparison bugs in authorization checks (String() wrapper added)
 * 
 * Reason: Prevent unauthorized post creation/modification and protect contact information
 * 
 * This file defines all API endpoints for managing service posts (listings)
 * in the ZipService marketplace application.
 *
 * ENDPOINTS PROVIDED:
 * 1. GET  /api/service-posts/search          - Radius-based search (PUBLIC)
 * 2. GET  /api/service-posts/all             - Get all active posts (PUBLIC)
 * 3. GET  /api/service-posts/user/:userId    - Get user's posts (PROTECTED)
 * 4. POST /api/service-posts                 - Create new post (PROTECTED)
 * 5. GET  /api/service-posts/:postId         - Get single post (PUBLIC)
 * 6. PUT  /api/service-posts/:postId         - Update post (PROTECTED)
 * 7. DELETE /api/service-posts/:postId       - Delete post (PROTECTED)
 * 8. PATCH /api/service-posts/:postId/inactivate - Soft delete (PROTECTED)
 *
 * FEATURES:
 * - Radius-based geographic search using Haversine formula
 * - Distance calculation in miles
 * - Results sorted by proximity
 * - Pagination support
 * - User profile integration
 * - Automatic location data from ZIP codes
 * ============================================================================
 */

import { Router, Request, Response } from 'express';
import { supabase } from "../config/Supabase";
import { createClient } from '@supabase/supabase-js';
import { calculateDistance } from '../utils/Distancecalculator';
import { 
  POST_STATUS, 
  POST_TYPES, 
  POSTER_TYPES,
  DEFAULT_SEARCH,
  LOGGING 
} from '../../src/Constants/servicePosts';
import { SUPABASE_ERROR } from '../../src/Constants/supabase';
import { getZipCoordinates, getZipLocation } from '../../src/Services/zipCodeService';
import { authenticateToken, authorizeUser, AuthRequest } from '../middleware/auth';

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

    const { data, error } = await supabase
      .from('service_posts')
      .select(`
        *,
        users!service_posts_user_id_fkey(
          email,
          business_owners(business_name, average_rating, review_count)
        )
      `)
      .eq('service_category', service_category as string)
      .eq('status', POST_STATUS.ACTIVE);

    console.log('🔍 DEBUG - Raw database response:');
    console.log('   Post count:', data?.length);
    if (data && data.length > 0) {
      console.log('   First post structure:', JSON.stringify(data[0], null, 2));
      console.log('   Users object:', data[0].users);
      console.log('   Business owners:', data[0].users?.business_owners);
    }

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
          review_count: post.users?.business_owners?.review_count || 0
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
// ENDPOINT 2: GET ALL SERVICE POSTS (PUBLIC)
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
          business_owners(business_name, average_rating, review_count)
        )
      `, { count: 'exact' })
      .eq('status', POST_STATUS.ACTIVE);

    if (post_type && (post_type === POST_TYPES.OFFER || post_type === POST_TYPES.REQUEST)) {
      query = query.eq('post_type', post_type);
    }

    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    console.log('📊 Executing query...');

    const { data, error, count } = await query;
    
    if (error) throw error;

    const posts = (data || []).map((post: any) => ({
      ...post,
      post_id: post.id,
      poster_name: post.users?.business_owners?.business_name || 
                   post.users?.email,
      business_name: post.users?.business_owners?.business_name,
      average_rating: post.users?.business_owners?.average_rating || 0,
      review_count: post.users?.business_owners?.review_count || 0
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
// ENDPOINT 3: GET SERVICE POSTS BY USER ID (PROTECTED)
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
          business_owners(business_name, average_rating, review_count)
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const posts = (data || []).map((post: any) => ({
      id: post.id,
      user_id: post.user_id,
      poster_type: post.poster_type,
      post_type: post.post_type,
      title: post.title,
      description: post.description,
      service_category: post.service_category,
      price_range: post.price_range,
      phone_number: post.phone_number,
      contact_email: post.contact_email,
      zip_code: post.zip_code,
      city: post.city,
      state: post.state,
      status: post.status,
      created_at: post.created_at,
      updated_at: post.updated_at,
      is_active: post.status === POST_STATUS.ACTIVE,
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
// ENDPOINT 4: CREATE NEW SERVICE POST (PROTECTED)
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
      price_range,
      phone_number,
      contact_email,
      zip_code
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

    // FIXED: January 9, 2026 - Convert both values to strings for proper comparison
    // Frontend sends user_id as number, but JWT token has user_id as string
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

    const { data: newPost, error } = await supabase
      .from('service_posts')
      .insert([{
        user_id,
        poster_type,
        post_type,
        title,
        description,
        service_category,
        price_range,
        phone_number,
        contact_email,
        zip_code,
        city,
        state,
        status: POST_STATUS.ACTIVE
      }])
      .select()
      .single();

    if (error) throw error;

    console.log('✅ Service post created successfully with ID:', newPost.id);

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
// ENDPOINT 5: GET USER PROFILE (DUPLICATE - Already in users.ts)
// ============================================================================
router.get('/api/users/:userId/profile', async (req: Request, res: Response): Promise<void> => {
  
  try {
    const { userId } = req.params;

    console.log('👤 Fetching profile for user:', userId);

    const { data, error } = await supabase
      .from('users')
      .select(`
        user_id,
        email,
        user_type,
        created_at,
        business_owners(
          business_name,
          phone_number,
          zip_code,
          city,
          state
        )
      `)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === SUPABASE_ERROR.NOT_FOUND) {
        res.status(404).json({
          success: false,
          error: 'User not found'
        });
        return;
      }
      throw error;
    }

    const profile = {
      user: {
        user_id: data.user_id,
        email: data.email,
        user_type: data.user_type,
        created_at: data.created_at
      },
      businessProfile: data.business_owners && data.business_owners.length > 0 ? {
        business_name: data.business_owners[0].business_name,
        phone_number: data.business_owners[0].phone_number,
        zip_code: data.business_owners[0].zip_code,
        city: data.business_owners[0].city,
        state: data.business_owners[0].state
      } : null
    };

    res.json({
      success: true,
      profile: profile
    });

  } catch (error: unknown) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user profile',
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
          business_owners(business_name, average_rating, review_count)
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

    const post = {
      ...data,
      post_id: data.id,
      poster_name: data.users?.business_owners?.business_name ||
                   data.users?.email,
      business_name: data.users?.business_owners?.business_name,
      average_rating: data.users?.business_owners?.average_rating || 0,
      review_count: data.users?.business_owners?.review_count || 0
    };

    console.log('✅ Found service post:', post.id);

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
      price_range,
      phone_number,
      contact_email,
      zip_code,
      post_type
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

    // FIXED: January 9, 2026 - Convert both values to strings for proper comparison
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

    const { data: updatedPost, error } = await supabase
      .from('service_posts')
      .update({
        title,
        description,
        service_category,
        price_range,
        phone_number,
        contact_email,
        zip_code,
        city,
        state,
        post_type,
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

    // FIXED: January 9, 2026 - Convert both values to strings for proper comparison
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

    // FIXED: January 9, 2026 - Convert both values to strings for proper comparison
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

export default router;