// routes/servicePosts.ts
// This file defines all API endpoints for managing service posts (listings)

// Import Express types for routing and handling requests/responses
import { Router, Request, Response } from 'express';
// Import PostgreSQL database pool for executing queries
import { Pool } from 'pg';

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
  // Extract the PostgreSQL connection pool from the request object
  const pool: Pool = (req as any).pool;
  
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
      // Build SQL query with LEFT JOINs to get poster information
      let exactQuery = `
        SELECT 
           sp.id as post_id,
          sp.*,
          COALESCE(bo.business_name, c.full_name, u.email) as poster_name,
          bo.business_name
        FROM service_posts sp
        LEFT JOIN users u ON sp.user_id = u.user_id
        LEFT JOIN customers c ON sp.user_id = c.user_id
        LEFT JOIN business_owners bo ON sp.user_id = bo.user_id
        WHERE sp.service_category = $1
          AND sp.status = 'active'
      `;

      // Initialize parameters array with service_category as first parameter
      const exactParams: any[] = [service_category];
      let paramIndex = 2; // Start at 2 since $1 is already used

      // Dynamically add location filters based on provided parameters
      // This builds the WHERE clause and parameters array dynamically
      
      // Add ZIP code filter if provided
      if (zip_code) {
        exactQuery += ` AND sp.zip_code = $${paramIndex}`;
        exactParams.push(zip_code);
        paramIndex++;
      }
      
      // Add city filter if provided (case-insensitive)
      if (city) {
        exactQuery += ` AND LOWER(sp.city) = LOWER($${paramIndex})`;
        exactParams.push(city);
        paramIndex++;
      }
      
      // Add state filter if provided (case-insensitive)
      if (state) {
        exactQuery += ` AND LOWER(sp.state) = LOWER($${paramIndex})`;
        exactParams.push(state);
        paramIndex++;
      }

      // Order by most recent posts first, limit to 50 results
      exactQuery += ` ORDER BY sp.created_at DESC LIMIT 50`;

      // Log the final query and parameters for debugging
      console.log('📊 Exact match query:', exactQuery);
      console.log('📊 Exact match params:', exactParams);

      // Execute the query against the database
      const exactResult = await pool.query(exactQuery, exactParams);
      exactMatches = exactResult.rows;

      console.log(`Found ${exactMatches.length} exact matches`);
    }

    // ========================================================================
    // PHASE 2: Search for nearby matches (Phoenix, AZ area)
    // Only execute if no exact matches were found
    // This provides fallback results when no local matches exist
    // ========================================================================
    if (exactMatches.length === 0) {
      const nearbyQuery = `
        SELECT 
           sp.id as post_id,
          sp.*,
          COALESCE(bo.business_name, c.full_name, u.email) as poster_name,
          bo.business_name
        FROM service_posts sp
        LEFT JOIN users u ON sp.user_id = u.user_id
        LEFT JOIN customers c ON sp.user_id = c.user_id
        LEFT JOIN business_owners bo ON sp.user_id = bo.user_id
        WHERE sp.service_category = $1
          AND sp.status = 'active'
          AND (
            LOWER(sp.city) LIKE '%phoenix%'
            OR LOWER(sp.state) = 'az'
            OR LOWER(sp.state) = 'arizona'
          )
        ORDER BY sp.created_at DESC
        LIMIT 50
      `;

      console.log('📊 Nearby match query:', nearbyQuery);

      // Execute nearby search with only service_category as parameter
      const nearbyResult = await pool.query(nearbyQuery, [service_category]);
      nearbyMatches = nearbyResult.rows;

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
  const pool: Pool = (req as any).pool;
  
  try {
    // Parse pagination and filter parameters from query string
    // Default to 100 items per page, starting at offset 0
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
    const post_type = req.query.post_type as string | undefined;

    console.log('📋 Fetching all service posts, limit:', limit, 'offset:', offset);

    // Build base query to fetch all active posts with poster information
    let query = `
      SELECT 
        sp.id as post_id,
        sp.*,
        COALESCE(bo.business_name, c.full_name, u.email) as poster_name,
        bo.business_name
      FROM service_posts sp
      LEFT JOIN users u ON sp.user_id = u.user_id
      LEFT JOIN customers c ON sp.user_id = c.user_id
      LEFT JOIN business_owners bo ON sp.user_id = bo.user_id
      WHERE sp.status = 'active'
    `;

    // Initialize parameters array and parameter index counter
    const params: (string | number)[] = [];
    let paramIndex = 1;

    // Optionally filter by post_type if provided and valid
    if (post_type && (post_type === 'offer' || post_type === 'request')) {
      query += ` AND sp.post_type = $${paramIndex}`;
      params.push(post_type);
      paramIndex++;
    }

    // Add ordering and pagination
    // Most recent posts first, with limit and offset for pagination
    query += ` ORDER BY sp.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    console.log('📊 All listings query:', query);
    console.log('📊 Query params:', params);

    // Execute the main query
    const result = await pool.query(query, params);

    console.log(`✅ Found ${result.rows.length} active service posts`);

    // ========================================================================
    // Get total count for pagination metadata
    // This helps the client know if there are more pages to load
    // ========================================================================
    let countQuery = `
      SELECT COUNT(*) as total
      FROM service_posts
      WHERE status = 'active'
    `;
    const countParams: (string | number)[] = [];
    
    // Apply same post_type filter to count query if used
    if (post_type && (post_type === 'offer' || post_type === 'request')) {
      countQuery += ' AND post_type = $1';
      countParams.push(post_type);
    }
    
    // Execute count query
    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);

    // Return posts with pagination metadata
    res.json({
      success: true,
      posts: result.rows,
      total: total,
      limit: limit,
      offset: offset,
      hasMore: (offset + result.rows.length) < total // Flag indicating if more pages exist
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
  const pool: Pool = (req as any).pool;
  
  try {
    // Extract userId from URL parameters
    const { userId } = req.params;

    console.log('📋 Fetching service posts for user:', userId);

    // Query to get all posts for a specific user with computed is_active field
    const query = `
      SELECT 
        sp.id,
        sp.user_id,
        sp.poster_type,
        sp.post_type,
        sp.title,
        sp.description,
        sp.service_category,
        sp.price_range,
        sp.phone_number,
        sp.contact_email,
        sp.zip_code,
        sp.city,
        sp.state,
        sp.status,
        sp.created_at,
        sp.updated_at,
        CASE 
          WHEN sp.status = 'active' THEN true 
          ELSE false 
        END as is_active,
        COALESCE(bo.business_name, u.email) as poster_name,
        bo.business_name
      FROM service_posts sp
      LEFT JOIN users u ON sp.user_id = u.user_id
      LEFT JOIN business_owners bo ON sp.user_id = bo.user_id
      WHERE sp.user_id = $1
      ORDER BY sp.created_at DESC
    `;

    // Execute query with userId parameter
    const result = await pool.query(query, [userId]);

    console.log(`✅ Found ${result.rows.length} posts for user ${userId}`);

    res.json({
      success: true,
      posts: result.rows,
      total: result.rows.length
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
// ENDPOINT: Get service categories
// Method: GET
// Path: /api/service-categories
// Purpose: Retrieve list of all unique service categories from active posts
//          Used to populate category dropdowns in the UI
// ============================================================================
router.get('/api/service-categories', async (req: Request, res: Response): Promise<void> => {
  const pool: Pool = (req as any).pool;
  
  try {
    // Query to get all distinct categories from active posts, sorted alphabetically
    const result = await pool.query(`
      SELECT DISTINCT service_category 
      FROM service_posts 
      WHERE status = 'active'
      ORDER BY service_category
    `);

    console.log(`✅ Found ${result.rows.length} service categories`);

    res.json({
      success: true,
      categories: result.rows.map(row => ({ name: row.service_category }))
    });

  } catch (error: unknown) {
    console.error('❌ Error fetching service categories:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch service categories',
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
  const pool: Pool = (req as any).pool;
  
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
    const insertQuery = `
      INSERT INTO service_posts (
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
        status,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'active', NOW(), NOW())
      RETURNING *
    `;

    const values = [
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
      state
    ];

    // Execute the insert query
    const result = await pool.query(insertQuery, values);

    console.log('✅ Service post created successfully with ID:', result.rows[0].id);

    res.status(201).json({
      success: true,
      post: result.rows[0],
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
  const pool: Pool = (req as any).pool;
  
  try {
    const { userId } = req.params;

    console.log('👤 Fetching profile for user:', userId);

    // Query joins users table with both customers and business_owners tables
    // This allows retrieving profile data regardless of user type
    const query = `
      SELECT 
        u.user_id,
        u.email,
        u.user_type,
        u.created_at,
        c.full_name as customer_name,
        c.phone_number as customer_phone,
        c.zip_code as customer_zip,
        c.city as customer_city,
        c.state as customer_state,
        bo.business_name,
        bo.phone_number as business_phone,
        bo.zip_code as business_zip,
        bo.city as business_city,
        bo.state as business_state
      FROM users u
      LEFT JOIN customers c ON u.user_id = c.user_id
      LEFT JOIN business_owners bo ON u.user_id = bo.user_id
      WHERE u.user_id = $1
    `;

    const result = await pool.query(query, [userId]);

    // Return 404 if user doesn't exist
    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'User not found'
      });
      return;
    }

    const row = result.rows[0];

    // Structure the profile data, only including profiles that exist
    const profile = {
      user: {
        user_id: row.user_id,
        email: row.email,
        user_type: row.user_type,
        created_at: row.created_at
      },
      // Only include customer profile if customer data exists
      customerProfile: row.customer_name ? {
        full_name: row.customer_name,
        phone_number: row.customer_phone,
        zip_code: row.customer_zip,
        city: row.customer_city,
        state: row.customer_state
      } : null,
      // Only include business profile if business data exists
      businessProfile: row.business_name ? {
        business_name: row.business_name,
        phone_number: row.business_phone,
        zip_code: row.business_zip,
        city: row.business_city,
        state: row.business_state
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
  const pool: Pool = (req as any).pool;
  
  try {
    // Extract postId from URL parameters
    const { postId } = req.params;

    console.log('📋 Fetching service post:', postId);

    // Query with JOINs to get post data along with poster information
    const query = `
      SELECT 
        sp.id as post_id,
        sp.id,
        sp.user_id,
        sp.poster_type,
        sp.post_type,
        sp.title,
        sp.description,
        sp.service_category,
        sp.price_range,
        sp.phone_number,
        sp.contact_email,
        sp.zip_code,
        sp.city,
        sp.state,
        sp.status,
        sp.created_at,
        sp.updated_at,
        COALESCE(bo.business_name, c.full_name, u.email) as poster_name,
        bo.business_name
      FROM service_posts sp
      LEFT JOIN users u ON sp.user_id = u.user_id
      LEFT JOIN customers c ON sp.user_id = c.user_id
      LEFT JOIN business_owners bo ON sp.user_id = bo.user_id
      WHERE sp.id = $1
    `;

    const result = await pool.query(query, [postId]);

    // Return 404 if post not found
    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Service post not found'
      });
      return;
    }

    console.log('✅ Found service post:', result.rows[0]);

    res.json({
      success: true,
      post: result.rows[0]
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
  const pool: Pool = (req as any).pool;
  
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

    // Update query with all fields and updated_at timestamp
    const updateQuery = `
      UPDATE service_posts 
      SET 
        title = $1,
        description = $2,
        service_category = $3,
        price_range = $4,
        phone_number = $5,
        contact_email = $6,
        zip_code = $7,
        city = $8,
        state = $9,
        post_type = $10,
        updated_at = NOW()
      WHERE id = $11
      RETURNING *
    `;

    const values = [
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
      postId
    ];

    // Execute update query
    const result = await pool.query(updateQuery, values);

    // Return 404 if post not found
    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Service post not found'
      });
      return;
    }

    console.log('✅ Service post updated successfully');

    res.json({
      success: true,
      post: result.rows[0],
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
  const pool: Pool = (req as any).pool;
  
  try {
    // Extract postId from URL parameters
    const { postId } = req.params;

    console.log('🗑️ Deleting service post:', postId);

    // Delete query with RETURNING to confirm deletion
    const query = `
      DELETE FROM service_posts 
      WHERE id = $1
      RETURNING *
    `;

    const result = await pool.query(query, [postId]);

    // Return 404 if post not found
    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Service post not found'
      });
      return;
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
  const pool: Pool = (req as any).pool;
  
  try {
    const { postId } = req.params;

    console.log('🔒 Inactivating service post:', postId);

    // Update status to inactive
    const query = `
      UPDATE service_posts 
      SET 
        status = 'closed',
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const result = await pool.query(query, [postId]);

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Service post not found'
      });
      return;
    }

    console.log('✅ Service post inactivated successfully');

    res.json({
      success: true,
      post: result.rows[0],
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