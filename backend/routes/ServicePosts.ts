// routes/servicePosts.ts
// This file defines all API endpoints for managing service posts (listings)

// Import Express types for routing and handling requests/responses
import { Router, Request, Response } from 'express';
import { supabase } from "../config/Supabase";

// Create a new Express router instance
const router = Router();

// ============================================================================
// ENDPOINT: Search service posts with exact and nearby matches
// Method: GET
// Path: /api/service-posts/search
// Purpose: Search for service posts by category and location (ZIP, city, state)
//          Returns exact matches first, then nearby matches in Phoenix area if no exact matches
// ============================================================================
router.get('/api/service-posts/search', async (req: Request, res: Response): Promise<void> => {
  
  try {
    // Extract search parameters from query string
    const { service_category, zip_code, city, state } = req.query;

    // Log the search parameters for debugging
    console.log('🔍 Search params:', { service_category, zip_code, city, state });

    // Validate that service_category is provided (required field)
    if (!service_category) {
      res.status(400).json({
        success: false,
        error: 'Service category is required'
      });
      return;
    }

    // Initialize arrays to store different types of matches
    let exactMatches: any[] = [];
    let nearbyMatches: any[] = [];

    // ========================================================================
    // PHASE 1: Search for exact location matches
    // Only execute if at least one location parameter is provided
    // ========================================================================
    if (zip_code || city || state) {
      // Build Supabase query with joins through users
      let query = supabase
        .from('service_posts')
        .select(`
          *,
          users!service_posts_user_id_fkey(
            email,
            customers(full_name),
            business_owners(business_name)
          )
        `)
        .eq('service_category', service_category as string)
        .eq('status', 'active');

      // Dynamically add location filters based on provided parameters
      if (zip_code) {
        query = query.eq('zip_code', zip_code as string);
      }
      
      if (city) {
        query = query.ilike('city', city as string);
      }
      
      if (state) {
        query = query.ilike('state', state as string);
      }

      // Order by most recent posts first, limit to 50 results
      query = query.order('created_at', { ascending: false }).limit(50);

      console.log('📊 Executing exact match query');

      // Execute the query
      const { data, error } = await query;
      
      if (error) throw error;

      // Map results to include poster_name and id as post_id
      exactMatches = (data || []).map((post: any) => ({
        ...post,
        post_id: post.id,
        poster_name: post.users?.business_owners?.[0]?.business_name || 
                     post.users?.customers?.[0]?.full_name || 
                     post.users?.email,
        business_name: post.users?.business_owners?.[0]?.business_name
      }));

      console.log(`Found ${exactMatches.length} exact matches`);
    }

    // ========================================================================
    // PHASE 2: Search for nearby matches (Phoenix, AZ area)
    // Only execute if no exact matches were found
    // This provides fallback results when no local matches exist
    // ========================================================================
    if (exactMatches.length === 0) {
      console.log('📊 Executing nearby match query');

      const { data, error } = await supabase
        .from('service_posts')
        .select(`
          *,
          users!service_posts_user_id_fkey(
            email,
            customers(full_name),
            business_owners(business_name)
          )
        `)
        .eq('service_category', service_category as string)
        .eq('status', 'active')
        .or('city.ilike.%phoenix%,state.ilike.az,state.ilike.arizona')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Map results to include poster_name and id as post_id
      nearbyMatches = (data || []).map((post: any) => ({
        ...post,
        post_id: post.id,
        poster_name: post.users?.business_owners?.[0]?.business_name || 
                     post.users?.customers?.[0]?.full_name || 
                     post.users?.email,
        business_name: post.users?.business_owners?.[0]?.business_name
      }));

      console.log(`Found ${nearbyMatches.length} nearby matches`);
    }

    // Return structured response with both types of matches
    res.json({
      success: true,
      exactMatches: exactMatches,
      nearbyMatches: nearbyMatches,
      hasExactMatches: exactMatches.length > 0,
      hasNearbyMatches: nearbyMatches.length > 0,
      searchParams: {
        service_category,
        zip_code,
        city,
        state
      }
    });

  } catch (error: unknown) {
    // Handle any database or server errors
    console.error('Error searching service posts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search service posts',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ============================================================================
// ENDPOINT: Get all service posts (for All Listings screen)
// Method: GET
// Path: /api/service-posts/all
// Purpose: Retrieve paginated list of all active service posts
//          Supports filtering by post_type (offer/request)
// ============================================================================
router.get('/api/service-posts/all', async (req: Request, res: Response): Promise<void> => {
  
  try {
    // Parse pagination and filter parameters from query string
    // Default to 100 items per page, starting at offset 0
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
    const post_type = req.query.post_type as string | undefined;

    console.log('📋 Fetching all service posts, limit:', limit, 'offset:', offset);

    // Build Supabase query
    let query = supabase
      .from('service_posts')
      .select(`
        *,
        users!service_posts_user_id_fkey(
          email,
          customers(full_name),
          business_owners(business_name)
        )
      `, { count: 'exact' })
      .eq('status', 'active');

    // Optionally filter by post_type if provided and valid
    if (post_type && (post_type === 'offer' || post_type === 'request')) {
      query = query.eq('post_type', post_type);
    }

    // Add ordering and pagination
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    console.log('📊 Executing all listings query');

    // Execute the query
    const { data, error, count } = await query;
    
    if (error) throw error;

    // Map results to include poster_name and id as post_id
    const posts = (data || []).map((post: any) => ({
      ...post,
      post_id: post.id,
      poster_name: post.users?.business_owners?.[0]?.business_name || 
                   post.users?.customers?.[0]?.full_name || 
                   post.users?.email,
      business_name: post.users?.business_owners?.[0]?.business_name
    }));

    console.log(`✅ Found ${posts.length} active service posts`);

    const total = count || 0;

    // Return posts with pagination metadata
    res.json({
      success: true,
      posts: posts,
      total: total,
      limit: limit,
      offset: offset,
      hasMore: (offset + posts.length) < total // Flag indicating if more pages exist
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
// ENDPOINT: Get service posts by user ID - used in Listing screens
// Method: GET
// Path: /api/service-posts/user/:userId
// Purpose: Retrieve all service posts created by a specific user
//          Used for "My Posts" functionality
// ============================================================================
router.get('/api/service-posts/user/:userId', async (req: Request, res: Response): Promise<void> => {
  
  try {
    // Extract userId from URL parameters
    const { userId } = req.params;

    console.log('📋 Fetching service posts for user:', userId);

    // Execute query
    const { data, error } = await supabase
      .from('service_posts')
      .select(`
        *,
        users!service_posts_user_id_fkey(
          email,
          business_owners(business_name)
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Map results and add computed is_active field
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
      is_active: post.status === 'active',
      poster_name: post.users?.business_owners?.[0]?.business_name || post.users?.email,
      business_name: post.users?.business_owners?.[0]?.business_name
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
// ENDPOINT: Create new service post
// Method: POST
// Path: /api/service-posts
// Purpose: Create a new service listing (offer or request)
// ============================================================================
router.post('/api/service-posts', async (req: Request, res: Response): Promise<void> => {
  
  try {
    // Extract post data from request body
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

    console.log('📝 Creating new service post:', { user_id, title, service_category });

    // Validate required fields
    if (!user_id || !poster_type || !post_type || !title || !service_category || !contact_email) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: user_id, poster_type, post_type, title, service_category, contact_email'
      });
      return;
    }

    // Validate post_type is either 'offer' or 'request'
    if (post_type !== 'offer' && post_type !== 'request') {
      res.status(400).json({
        success: false,
        error: 'Invalid post_type. Must be either "offer" or "request"'
      });
      return;
    }

    // Initialize location variables
    let city: string | null = null;
    let state: string | null = null;

    // ========================================================================
    // Fetch city and state from ZIP code using external API
    // This auto-populates location data for the user
    // ========================================================================
    if (zip_code) {
      try {
        const zipResponse = await fetch(`https://api.zippopotam.us/us/${zip_code}`);
        if (zipResponse.ok) {
          const zipData = await zipResponse.json();
          city = zipData.places[0]["place name"];
          state = zipData.places[0]["state abbreviation"];
          console.log(`📍 Location from ZIP ${zip_code}: ${city}, ${state}`);
        }
      } catch (zipError) {
        // If ZIP lookup fails, continue without city/state
        console.warn('Could not fetch location data for zip code:', zip_code);
      }
    }

    // Insert new post into database
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
        status: 'active'
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
// ENDPOINT: Get user profile
// Method: GET
// Path: /api/users/:userId/profile
// Purpose: Retrieve complete user profile including customer and business info
// ============================================================================
router.get('/api/users/:userId/profile', async (req: Request, res: Response): Promise<void> => {
  
  try {
    const { userId } = req.params;

    console.log('👤 Fetching profile for user:', userId);

    // Query with joins to get user and profile data
    const { data, error } = await supabase
      .from('users')
      .select(`
        user_id,
        email,
        user_type,
        created_at,
        customers(
          full_name,
          phone_number,
          zip_code,
          city,
          state
        ),
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
      if (error.code === 'PGRST116') {
        // Not found
        res.status(404).json({
          success: false,
          error: 'User not found'
        });
        return;
      }
      throw error;
    }

    // Structure the profile data, only including profiles that exist
    const profile = {
      user: {
        user_id: data.user_id,
        email: data.email,
        user_type: data.user_type,
        created_at: data.created_at
      },
      // Only include customer profile if customer data exists
      customerProfile: data.customers && data.customers.length > 0 ? {
        full_name: data.customers[0].full_name,
        phone_number: data.customers[0].phone_number,
        zip_code: data.customers[0].zip_code,
        city: data.customers[0].city,
        state: data.customers[0].state
      } : null,
      // Only include business profile if business data exists
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
// ENDPOINT: Get single service post by ID
// Method: GET
// Path: /api/service-posts/:postId
// Purpose: Retrieve detailed information about a specific service post
// ============================================================================
router.get('/api/service-posts/:postId', async (req: Request, res: Response): Promise<void> => {
  
  try {
    // Extract postId from URL parameters
    const { postId } = req.params;

    console.log('📋 Fetching service post:', postId);

    // Query with joins to get post data along with poster information
    const { data, error } = await supabase
      .from('service_posts')
      .select(`
        *,
        users!service_posts_user_id_fkey(
          email,
          customers(full_name),
          business_owners(business_name)
        )
      `)
      .eq('id', postId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        res.status(404).json({
          success: false,
          error: 'Service post not found'
        });
        return;
      }
      throw error;
    }

    // Map result to include poster_name and id as post_id
    const post = {
      ...data,
      post_id: data.id,
      poster_name: data.users?.business_owners?.[0]?.business_name || 
                   data.users?.customers?.[0]?.full_name || 
                   data.users?.email,
      business_name: data.users?.business_owners?.[0]?.business_name
    };

    console.log('✅ Found service post:', post);

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
// ENDPOINT: Update service post
// Method: PUT
// Path: /api/service-posts/:postId
// Purpose: Update an existing service post with new information
// ============================================================================
router.put('/api/service-posts/:postId', async (req: Request, res: Response): Promise<void> => {
  
  try {
    // Extract postId from URL and updated fields from request body
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
    console.log('Update data:', req.body);

    // Validate required fields
    if (!title || !service_category || !contact_email) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: title, service_category, contact_email'
      });
      return;
    }

    // Initialize location variables
    let city: string | null = null;
    let state: string | null = null;

    // Fetch updated location data if ZIP code is provided
    if (zip_code) {
      try {
        const zipResponse = await fetch(`https://api.zippopotam.us/us/${zip_code}`);
        if (zipResponse.ok) {
          const zipData = await zipResponse.json();
          city = zipData.places[0]["place name"];
          state = zipData.places[0]["state abbreviation"];
          console.log(`📍 Location from ZIP ${zip_code}: ${city}, ${state}`);
        }
      } catch (zipError) {
        console.warn('Could not fetch location data for zip code:', zip_code);
      }
    }

    // Execute update query
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
      if (error.code === 'PGRST116') {
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
// ENDPOINT: Delete service post
// Method: DELETE
// Path: /api/service-posts/:postId
// Purpose: Permanently delete a service post from the database
// ============================================================================
router.delete('/api/service-posts/:postId', async (req: Request, res: Response): Promise<void> => {
  
  try {
    // Extract postId from URL parameters
    const { postId } = req.params;

    console.log('🗑️ Deleting service post:', postId);

    // Execute delete query
    const { error } = await supabase
      .from('service_posts')
      .delete()
      .eq('id', postId);

    if (error) {
      if (error.code === 'PGRST116') {
        res.status(404).json({
          success: false,
          error: 'Service post not found'
        });
        return;
      }
      throw error;
    }

    console.log('✅ Service post deleted successfully');

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
// ENDPOINT: Inactivate service post
// Method: PATCH
// Path: /api/service-posts/:postId/inactivate
// Purpose: Mark a service post as inactive (soft delete)
// ============================================================================
router.patch('/api/service-posts/:postId/inactivate', async (req: Request, res: Response): Promise<void> => {
  
  try {
    const { postId } = req.params;

    console.log('🔒 Inactivating service post:', postId);

    // Update status to inactive
    const { data: inactivatedPost, error } = await supabase
      .from('service_posts')
      .update({
        status: 'closed',
        updated_at: new Date().toISOString()
      })
      .eq('id', postId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        res.status(404).json({
          success: false,
          error: 'Service post not found'
        });
        return;
      }
      throw error;
    }

    console.log('✅ Service post inactivated successfully');

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

// Export the router to be used in the main server file
export default router;