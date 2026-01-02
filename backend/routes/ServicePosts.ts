// ============================================================================
// routes/servicePosts.ts
// ============================================================================
// This file defines all API endpoints for managing service posts (listings)
// in the ZipService marketplace application.
//
// ENDPOINTS PROVIDED:
// 1. GET  /api/service-posts/search          - Radius-based search for services
// 2. GET  /api/service-posts/all             - Get all active service posts
// 3. GET  /api/service-posts/user/:userId    - Get posts by specific user
// 4. POST /api/service-posts                 - Create new service post
// 5. GET  /api/service-posts/:postId         - Get single post by ID
// 6. PUT  /api/service-posts/:postId         - Update existing post
// 7. DELETE /api/service-posts/:postId       - Permanently delete post
// 8. PATCH /api/service-posts/:postId/inactivate - Soft delete (mark inactive)
//
// FEATURES:
// - Radius-based geographic search using Haversine formula
// - Distance calculation in miles
// - Results sorted by proximity
// - Pagination support
// - User profile integration
// - Automatic location data from ZIP codes
// ============================================================================

// Import Express types for routing and handling requests/responses
import { Router, Request, Response } from 'express';
import { supabase } from "../config/Supabase";
// Import admin client for operations that need to bypass RLS
import { createClient } from '@supabase/supabase-js';
// Import distance calculation utilities for radius-based search
import { calculateDistance, getZipCoordinates } from '../Utils/Distancecalculator ';

// Create admin client with service role key (bypasses RLS)
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Create a new Express router instance
const router = Router();

// ============================================================================
// ENDPOINT 1: RADIUS-BASED SERVICE SEARCH
// ============================================================================
// Method: GET
// Path: /api/service-posts/search
// Query Parameters:
//   - service_category (required): Category to search (e.g., "Cleaning", "Beauty")
//   - zip_code (required): Center point ZIP code for radius search
//   - radius (optional): Search radius in miles (default: 25)
//
// PURPOSE:
// Finds service posts within a specified radius of a given ZIP code.
// Uses geographic coordinates and Haversine formula for accurate distance
// calculation. Returns results sorted by distance (closest first).
//
// HOW IT WORKS:
// 1. Validates input parameters (category, ZIP code, radius)
// 2. Converts search ZIP code to lat/lon coordinates
// 3. Fetches all active posts in the specified category
// 4. Calculates distance from search center to each post
// 5. Filters posts within radius
// 6. Sorts by distance and returns results
//
// EXAMPLE REQUEST:
// GET /api/service-posts/search?service_category=Cleaning&zip_code=85083&radius=25
//
// EXAMPLE RESPONSE:
// {
//   "success": true,
//   "posts": [
//     {
//       "id": 123,
//       "title": "Professional House Cleaning",
//       "zip_code": "85024",
//       "city": "Phoenix",
//       "state": "AZ",
//       "distance": 15.2,  // miles from search center
//       "poster_name": "ABC Cleaning"
//     }
//   ],
//   "searchCenter": { "zipCode": "85083", "lat": 33.5186, "lon": -112.2624 },
//   "radius": 25,
//   "count": 1
// }
// ============================================================================
router.get('/api/service-posts/search', async (req: Request, res: Response): Promise<void> => {
  
  try {
    // ========================================================================
    // STEP 1: Extract and Validate Query Parameters
    // ========================================================================
    // Extract search parameters from the query string
    // - service_category: What type of service to search for
    // - zip_code: Center point for radius search
    // - radius: How far to search (in miles), defaults to 25
    
    const { 
      service_category, 
      zip_code,
      radius = '25'  // Default to 25 miles if not specified
    } = req.query;

    // Log the incoming search request for debugging
    console.log('🔍 Search request received:', { 
      service_category, 
      zip_code, 
      radius,
      timestamp: new Date().toISOString()
    });

    // Validate that service_category is provided (required field)
    // Without this, we don't know what type of service to search for
    if (!service_category) {
      console.error('❌ Missing service_category parameter');
      res.status(400).json({
        success: false,
        error: 'Service category is required',
        hint: 'Add ?service_category=YourCategory to the URL'
      });
      return;
    }

    // Validate that zip_code is provided (required for radius search)
    // Without this, we don't have a center point for the search
    if (!zip_code) {
      console.error('❌ Missing zip_code parameter');
      res.status(400).json({
        success: false,
        error: 'ZIP code is required for radius search',
        hint: 'Add &zip_code=12345 to the URL'
      });
      return;
    }

    // Convert radius from string to number and validate
    // Must be a positive integer representing miles
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

    // Log validated parameters
    console.log('✅ Parameters validated:', {
      category: service_category,
      zipCode: zip_code,
      radius: radiusMiles
    });

    // ========================================================================
    // STEP 2: Convert Search ZIP Code to Geographic Coordinates
    // ========================================================================
    // Geographic coordinates (latitude, longitude) are needed to calculate
    // distances between locations. We use a free API to look up the coordinates
    // for the search ZIP code.
    //
    // Example: ZIP 85083 (Peoria, AZ) → Lat: 33.5186, Lon: -112.2624
    console.log(`📍 Looking up coordinates for ZIP code ${zip_code}...`);
    
    const searchCoords = await getZipCoordinates(zip_code as string);
    
    // If the ZIP code is invalid or not found, return an error
    // This could happen if:
    // - ZIP code doesn't exist
    // - ZIP code is not in the US
    // - ZIP code has incorrect format (not 5 digits)
    if (!searchCoords) {
      console.error(`❌ Invalid or not found: ZIP ${zip_code}`);
      res.status(400).json({
        success: false,
        error: 'Invalid ZIP code or ZIP code not found',
        hint: 'Please provide a valid 5-digit US ZIP code'
      });
      return;
    }

    // Log the search center coordinates for debugging
    console.log(`✅ Search center established:`, {
      zipCode: zip_code,
      latitude: searchCoords.lat,
      longitude: searchCoords.lon
    });

    // ========================================================================
    // STEP 3: Fetch All Active Posts in the Specified Category
    // ========================================================================
    // We fetch ALL active posts in the category first, then calculate distances
    // in the next step. This is more efficient than trying to filter by distance
    // in the database query, since geographic distance requires coordinates.
    //
    // The query includes:
    // - All fields from service_posts table
    // - Related user information (email)
    // - Related customer information (full_name)
    // - Related business owner information (business_name)
    console.log(`📊 Querying database for category: ${service_category}`);
    console.log('   Fetching all active posts for distance calculation...');

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
      .eq('service_category', service_category as string)  // Filter by category
      .eq('status', 'active');  // Only get active (not closed) posts

    // Handle database query errors
    if (error) {
      console.error('❌ Database query error:', error);
      throw error;
    }

    // If no posts exist in this category at all, return empty results
    // This is not an error - it just means there are no services available yet
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

    // Log how many posts we're processing
    console.log(`✅ Found ${data.length} total posts in category`);
    console.log('   Now calculating distances for each post...');

    // ========================================================================
    // STEP 4: Calculate Distance for Each Post
    // ========================================================================
    // For each post, we:
    // 1. Get the coordinates of the post's ZIP code
    // 2. Calculate the distance between search center and post location
    // 3. Filter out posts beyond the specified radius
    // 4. Add distance information to each post
    //
    // We use Promise.all to process all posts in parallel for better performance.
    // This is faster than processing them one by one.
    const postsWithDistance = await Promise.all(
      data.map(async (post: any, index: number) => {
        // Log progress for every 10 posts (to avoid console spam)
        if (index % 10 === 0) {
          console.log(`   Processing posts ${index + 1}-${Math.min(index + 10, data.length)} of ${data.length}...`);
        }

        // ====================================================================
        // Skip posts without ZIP codes
        // ====================================================================
        // Some posts might not have a ZIP code if:
        // - Post was created before ZIP code was required
        // - Data migration issue
        // - User manually entered invalid data
        if (!post.zip_code) {
          console.log(`   ⚠️ Post ID ${post.id} has no ZIP code, skipping`);
          return null;
        }

        // ====================================================================
        // Get coordinates for this post's ZIP code
        // ====================================================================
        // Convert the post's ZIP code to lat/lon coordinates
        // This uses the same utility function, with caching to improve performance
        const postCoords = await getZipCoordinates(post.zip_code);
        
        // If we can't get coordinates for this ZIP code, skip this post
        // This could happen if:
        // - ZIP code is invalid
        // - ZIP code was entered incorrectly
        // - ZIP code doesn't exist in the lookup database
        if (!postCoords) {
          console.log(`   ⚠️ Invalid ZIP code ${post.zip_code} for post ID ${post.id}, skipping`);
          return null;
        }

        // ====================================================================
        // Calculate distance using Haversine formula
        // ====================================================================
        // The Haversine formula calculates the great-circle distance between
        // two points on a sphere (Earth) given their lat/lon coordinates.
        // This gives us accurate "as-the-crow-flies" distance in miles.
        //
        // Example calculation:
        // - Search: ZIP 85083 (33.5186, -112.2624)
        // - Post:   ZIP 85024 (33.5062, -112.0739)
        // - Result: ~15.2 miles
        const distance = calculateDistance(
          searchCoords.lat,      // Search center latitude
          searchCoords.lon,      // Search center longitude
          postCoords.lat,        // Post location latitude
          postCoords.lon         // Post location longitude
        );

        // Round distance to 1 decimal place for better readability
        // Example: 15.2347 miles → 15.2 miles
        const roundedDistance = Math.round(distance * 10) / 10;

        // Log distance calculation for debugging (only for first 5 posts)
        if (index < 5) {
          console.log(`   📏 Post ${post.id} (${post.zip_code}): ${roundedDistance} miles away`);
        }

        // ====================================================================
        // Filter out posts beyond the specified radius
        // ====================================================================
        // If the post is too far away, exclude it from results
        // Example: If radius is 25 miles and post is 30 miles away, skip it
        if (roundedDistance > radiusMiles) {
          return null;  // Exclude this post from results
        }

        // ====================================================================
        // Build the result object with all post data plus distance
        // ====================================================================
        // Return the post with:
        // - All original post data
        // - Calculated distance
        // - Poster name (from related tables)
        // - Business name (if posted by business owner)
        return {
          // Spread all original post fields
          ...post,
          // Add post_id as an alias for id (for frontend compatibility)
          post_id: post.id,
          // Add calculated distance
          distance: roundedDistance,
          // Extract poster name from related tables in priority order:
          // 1. Business owner's business name
          // 2. Customer's full name
          // 3. User's email (fallback)
          poster_name: post.users?.business_owners?.[0]?.business_name || 
                       post.users?.customers?.[0]?.full_name || 
                       post.users?.email,
          // Extract business name (null if posted by customer)
          business_name: post.users?.business_owners?.[0]?.business_name
        };
      })
    );

    console.log('   ✅ Distance calculation complete');

    // ========================================================================
    // STEP 5: Filter and Sort Results
    // ========================================================================
    // Remove null entries (posts that were skipped or filtered out)
    // and sort remaining posts by distance (closest first)
    //
    // Example sorted results:
    // 1. Post at 5.2 miles
    // 2. Post at 12.8 miles
    // 3. Post at 18.3 miles
    // 4. Post at 24.9 miles
    const nearbyPosts = postsWithDistance
      .filter(post => post !== null)  // Remove nulls (excluded posts)
      .sort((a, b) => a!.distance - b!.distance);  // Sort by distance ascending

    // Log final results
    console.log(`✅ Search complete: ${nearbyPosts.length} posts found within ${radiusMiles} miles`);
    if (nearbyPosts.length > 0) {
      console.log(`   Closest: ${nearbyPosts[0]!.distance} miles`);
      console.log(`   Farthest: ${nearbyPosts[nearbyPosts.length - 1]!.distance} miles`);
    }

    // ========================================================================
    // STEP 6: Return Results to Client
    // ========================================================================
    // Return a structured response with:
    // - success flag
    // - array of posts with distance information
    // - search center information (for display on map)
    // - radius used
    // - count of results
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
    // ========================================================================
    // Error Handling
    // ========================================================================
    // Catch any unexpected errors and return a 500 error response
    // Log the full error for debugging
    console.error('❌ Error in search endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search service posts',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ============================================================================
// ENDPOINT 2: GET ALL SERVICE POSTS
// ============================================================================
// Method: GET
// Path: /api/service-posts/all
// Query Parameters:
//   - limit (optional): Number of posts per page (default: 100)
//   - offset (optional): Number of posts to skip (default: 0)
//   - post_type (optional): Filter by 'offer' or 'request'
//
// PURPOSE:
// Retrieve a paginated list of all active service posts across all locations.
// Used for "All Listings" or "Browse Services" screens.
// Supports filtering by post type (services offered vs. services requested).
//
// PAGINATION:
// - limit: How many results to return (e.g., 20 per page)
// - offset: How many results to skip (e.g., skip first 20 for page 2)
// - Example: Page 1: offset=0, limit=20
//            Page 2: offset=20, limit=20
//            Page 3: offset=40, limit=20
//
// EXAMPLE REQUEST:
// GET /api/service-posts/all?limit=20&offset=0&post_type=offer
//
// EXAMPLE RESPONSE:
// {
//   "success": true,
//   "posts": [...],
//   "total": 156,
//   "limit": 20,
//   "offset": 0,
//   "hasMore": true  // More results available
// }
// ============================================================================
router.get('/api/service-posts/all', async (req: Request, res: Response): Promise<void> => {
  
  try {
    // Parse pagination parameters from query string
    // If not provided, use sensible defaults
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
    const post_type = req.query.post_type as string | undefined;

    console.log('📋 Fetching all service posts');
    console.log(`   Pagination: limit=${limit}, offset=${offset}`);
    if (post_type) {
      console.log(`   Filter: post_type=${post_type}`);
    }

    // Build Supabase query with joins to get user information
    let query = supabase
      .from('service_posts')
      .select(`
        *,
        users!service_posts_user_id_fkey(
          email,
          customers(full_name),
          business_owners(business_name)
        )
      `, { count: 'exact' })  // Include total count for pagination
      .eq('status', 'active');  // Only active posts

    // Optionally filter by post_type if provided and valid
    // post_type can be either 'offer' (offering a service) or 'request' (requesting a service)
    if (post_type && (post_type === 'offer' || post_type === 'request')) {
      query = query.eq('post_type', post_type);
    }

    // Add ordering (most recent first) and pagination
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);  // Inclusive range for pagination

    console.log('📊 Executing query...');

    // Execute the query
    const { data, error, count } = await query;
    
    if (error) throw error;

    // Map results to include poster_name and post_id
    const posts = (data || []).map((post: any) => ({
      ...post,
      post_id: post.id,
      poster_name: post.users?.business_owners?.[0]?.business_name || 
                   post.users?.customers?.[0]?.full_name || 
                   post.users?.email,
      business_name: post.users?.business_owners?.[0]?.business_name
    }));

    const total = count || 0;

    console.log(`✅ Found ${posts.length} posts (${total} total)`);

    // Return posts with pagination metadata
    res.json({
      success: true,
      posts: posts,
      total: total,
      limit: limit,
      offset: offset,
      hasMore: (offset + posts.length) < total  // Flag indicating if more pages exist
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
// ENDPOINT 3: GET SERVICE POSTS BY USER ID
// ============================================================================
// Method: GET
// Path: /api/service-posts/user/:userId
// URL Parameters:
//   - userId (required): The user_id to fetch posts for
//
// PURPOSE:
// Retrieve all service posts created by a specific user.
// Used for "My Posts" or "My Listings" functionality where users can
// view and manage their own service posts.
//
// RETURNS:
// All posts (both active and inactive) created by the specified user,
// ordered by creation date (most recent first).
//
// EXAMPLE REQUEST:
// GET /api/service-posts/user/175
//
// EXAMPLE RESPONSE:
// {
//   "success": true,
//   "posts": [
//     {
//       "id": 123,
//       "title": "Professional House Cleaning",
//       "status": "active",
//       "is_active": true,
//       "created_at": "2025-01-15T10:30:00Z"
//     }
//   ],
//   "total": 1
// }
// ============================================================================
router.get('/api/service-posts/user/:userId', async (req: Request, res: Response): Promise<void> => {
  
  try {
    // Extract userId from URL parameters
    // Example: /api/service-posts/user/175 → userId = "175"
    const { userId } = req.params;

    console.log('📋 Fetching service posts for user:', userId);

    // Execute query to get all posts by this user
    // Note: We don't filter by status here - user should see all their posts
    // (both active and inactive)
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
    // is_active is a boolean computed from the status field
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
      is_active: post.status === 'active',  // Computed boolean field
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
// ENDPOINT 4: CREATE NEW SERVICE POST
// ============================================================================
// Method: POST
// Path: /api/service-posts
// Body Parameters (all required unless noted):
//   - user_id: ID of user creating the post
//   - poster_type: 'customer' or 'business_owner'
//   - post_type: 'offer' (offering service) or 'request' (requesting service)
//   - title: Title of the service post
//   - service_category: Category (e.g., "Cleaning", "Beauty")
//   - contact_email: Email for contact
//   - description (optional): Detailed description
//   - price_range (optional): Price range or rate
//   - phone_number (optional): Phone number for contact
//   - zip_code (optional but recommended): ZIP code for location
//
// PURPOSE:
// Create a new service listing (either an offer or a request).
// Automatically fetches city and state from ZIP code if provided.
// Posts are created as 'active' by default.
//
// LOCATION AUTO-POPULATION:
// If zip_code is provided, the endpoint automatically looks up the city
// and state using a free ZIP code API and adds them to the post.
//
// EXAMPLE REQUEST BODY:
// {
//   "user_id": 175,
//   "poster_type": "business_owner",
//   "post_type": "offer",
//   "title": "Professional House Cleaning",
//   "service_category": "Cleaning",
//   "contact_email": "clean@example.com",
//   "zip_code": "85024"
// }
//
// EXAMPLE RESPONSE:
// {
//   "success": true,
//   "post": { "id": 123, "title": "Professional House Cleaning", ... },
//   "message": "Service post created successfully"
// }
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

    console.log('📝 Creating new service post');
    console.log(`   User: ${user_id}, Title: "${title}", Category: ${service_category}`);

    // Validate required fields
    if (!user_id || !poster_type || !post_type || !title || !service_category || !contact_email) {
      console.error('❌ Missing required fields');
      res.status(400).json({
        success: false,
        error: 'Missing required fields: user_id, poster_type, post_type, title, service_category, contact_email'
      });
      return;
    }

    // Validate post_type is either 'offer' or 'request'
    if (post_type !== 'offer' && post_type !== 'request') {
      console.error('❌ Invalid post_type:', post_type);
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
        console.log(`   📍 Looking up location for ZIP ${zip_code}...`);
        const zipResponse = await fetch(`https://api.zippopotam.us/us/${zip_code}`);
        if (zipResponse.ok) {
          const zipData = await zipResponse.json();
          city = zipData.places[0]["place name"];
          state = zipData.places[0]["state abbreviation"];
          console.log(`   ✅ Location: ${city}, ${state}`);
        }
      } catch (zipError) {
        // If ZIP lookup fails, continue without city/state
        // This is not critical - the post can still be created
        console.warn('   ⚠️ Could not fetch location data for zip code:', zip_code);
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
        status: 'active'  // New posts are active by default
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
// ENDPOINT 5: GET USER PROFILE
// ============================================================================
// Method: GET
// Path: /api/users/:userId/profile
// URL Parameters:
//   - userId: The user_id to fetch profile for
//
// PURPOSE:
// Retrieve complete user profile including both customer and business owner
// information if available. Used for profile viewing and editing.
//
// RETURNS:
// User information with optional customer and business profiles.
// Either customerProfile or businessProfile will be populated (or both if
// user has multiple roles).
//
// EXAMPLE REQUEST:
// GET /api/users/175/profile
//
// EXAMPLE RESPONSE:
// {
//   "success": true,
//   "profile": {
//     "user": {
//       "user_id": 175,
//       "email": "john@example.com",
//       "user_type": "business_owner"
//     },
//     "customerProfile": null,
//     "businessProfile": {
//       "business_name": "ABC Cleaning",
//       "phone_number": "555-1234",
//       "city": "Phoenix",
//       "state": "AZ"
//     }
//   }
// }
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
// ENDPOINT 6: GET SINGLE SERVICE POST BY ID
// ============================================================================
// Method: GET
// Path: /api/service-posts/:postId
// URL Parameters:
//   - postId: The service post ID to fetch
//
// PURPOSE:
// Retrieve detailed information about a specific service post.
// Used when viewing a single post's details.
//
// EXAMPLE REQUEST:
// GET /api/service-posts/123
//
// EXAMPLE RESPONSE:
// {
//   "success": true,
//   "post": {
//     "id": 123,
//     "title": "Professional House Cleaning",
//     "description": "...",
//     "poster_name": "ABC Cleaning",
//     ...
//   }
// }
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

    // Map result to include poster_name and post_id
    const post = {
      ...data,
      post_id: data.id,
      poster_name: data.users?.business_owners?.[0]?.business_name || 
                   data.users?.customers?.[0]?.full_name || 
                   data.users?.email,
      business_name: data.users?.business_owners?.[0]?.business_name
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
// ENDPOINT 7: UPDATE SERVICE POST
// ============================================================================
// Method: PUT
// Path: /api/service-posts/:postId
// URL Parameters:
//   - postId: The service post ID to update
// Body Parameters:
//   - title (required): Updated title
//   - service_category (required): Updated category
//   - contact_email (required): Updated contact email
//   - description (optional): Updated description
//   - price_range (optional): Updated price range
//   - phone_number (optional): Updated phone number
//   - zip_code (optional): Updated ZIP code
//   - post_type (optional): Updated post type
//
// PURPOSE:
// Update an existing service post with new information.
// Used in the "Edit Listing" functionality.
// Automatically updates city and state if ZIP code changes.
//
// EXAMPLE REQUEST:
// PUT /api/service-posts/123
// Body: {
//   "title": "Updated Title",
//   "service_category": "Cleaning",
//   "contact_email": "new@example.com",
//   "zip_code": "85024"
// }
//
// EXAMPLE RESPONSE:
// {
//   "success": true,
//   "post": { "id": 123, "title": "Updated Title", ... },
//   "message": "Service post updated successfully"
// }
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
    console.log('   Updated fields:', Object.keys(req.body).join(', '));

    // Validate required fields
    if (!title || !service_category || !contact_email) {
      console.error('❌ Missing required fields');
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
        console.log(`   📍 Looking up updated location for ZIP ${zip_code}...`);
        const zipResponse = await fetch(`https://api.zippopotam.us/us/${zip_code}`);
        if (zipResponse.ok) {
          const zipData = await zipResponse.json();
          city = zipData.places[0]["place name"];
          state = zipData.places[0]["state abbreviation"];
          console.log(`   ✅ Updated location: ${city}, ${state}`);
        }
      } catch (zipError) {
        console.warn('   ⚠️ Could not fetch location data for zip code:', zip_code);
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
// ENDPOINT 8: DELETE SERVICE POST (HARD DELETE)
// ============================================================================
// Method: DELETE
// Path: /api/service-posts/:postId
// URL Parameters:
//   - postId: The service post ID to delete
//
// PURPOSE:
// Permanently delete a service post from the database.
// This is a destructive operation and cannot be undone.
// Consider using the inactivate endpoint (PATCH) instead for a soft delete.
//
// EXAMPLE REQUEST:
// DELETE /api/service-posts/123
//
// EXAMPLE RESPONSE:
// {
//   "success": true,
//   "message": "Service post deleted successfully"
// }
// ============================================================================
router.delete('/api/service-posts/:postId', async (req: Request, res: Response): Promise<void> => {
  
  try {
    // Extract postId from URL parameters
    const { postId } = req.params;

    console.log('🗑️ Permanently deleting service post:', postId);

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
// ENDPOINT 9: INACTIVATE SERVICE POST (SOFT DELETE)
// ============================================================================
// Method: PATCH
// Path: /api/service-posts/:postId/inactivate
// URL Parameters:
//   - postId: The service post ID to inactivate
//
// PURPOSE:
// Mark a service post as inactive (closed) without permanently deleting it.
// This is a safer alternative to hard delete - the post can be reactivated
// later if needed.
//
// STATUS CHANGES:
// - Before: status = 'active'
// - After: status = 'closed'
//
// Inactive posts:
// - Do not appear in search results
// - Cannot be contacted
// - Still exist in database for history/records
// - Can be viewed by the owner in "My Listings"
//
// EXAMPLE REQUEST:
// PATCH /api/service-posts/123/inactivate
//
// EXAMPLE RESPONSE:
// {
//   "success": true,
//   "post": { "id": 123, "status": "closed", ... },
//   "message": "Service post inactivated successfully"
// }
// ============================================================================
router.patch('/api/service-posts/:postId/inactivate', async (req: Request, res: Response): Promise<void> => {
  
  try {
    const { postId } = req.params;

    console.log('🔒 Inactivating (soft delete) service post:', postId);

     // Update status to inactive using admin client (bypasses RLS)
    const { data: inactivatedPost, error } = await supabaseAdmin  
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
// Export the router to be used in the main server file
// ============================================================================
// The router is imported in server.ts and mounted at a specific path:
// app.use('/service-posts', servicePostsRouter);
// or
// app.use('/api/service-posts', servicePostsRouter);
export default router;