// routes/servicePosts.ts
import { Router, Request, Response } from 'express';
import { Pool } from 'pg';

const router = Router();

// Search service posts with exact and nearby matches
router.get('/api/service-posts/search', async (req: Request, res: Response): Promise<void> => {
  const pool: Pool = (req as any).pool;
  
  try {
    const { service_category, zip_code, city, state } = req.query;

    console.log('🔍 Search params:', { service_category, zip_code, city, state });

    if (!service_category) {
      res.status(400).json({
        success: false,
        error: 'Service category is required'
      });
      return;
    }

    let exactMatches: any[] = [];
    let nearbyMatches: any[] = [];

    // Search for exact matches (by zip code, city, or state)
    if (zip_code || city || state) {
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

      const exactParams: any[] = [service_category];
      let paramIndex = 2;

      // Add location filters
      if (zip_code) {
        exactQuery += ` AND sp.zip_code = $${paramIndex}`;
        exactParams.push(zip_code);
        paramIndex++;
      }
      
      if (city) {
        exactQuery += ` AND LOWER(sp.city) = LOWER($${paramIndex})`;
        exactParams.push(city);
        paramIndex++;
      }
      
      if (state) {
        exactQuery += ` AND LOWER(sp.state) = LOWER($${paramIndex})`;
        exactParams.push(state);
        paramIndex++;
      }

      exactQuery += ` ORDER BY sp.created_at DESC LIMIT 50`;

      console.log('📊 Exact match query:', exactQuery);
      console.log('📊 Exact match params:', exactParams);

      const exactResult = await pool.query(exactQuery, exactParams);
      exactMatches = exactResult.rows;

      console.log(`Found ${exactMatches.length} exact matches`);
    }

    // If no exact matches, search for nearby matches in Phoenix, AZ area
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

      const nearbyResult = await pool.query(nearbyQuery, [service_category]);
      nearbyMatches = nearbyResult.rows;

      console.log(`Found ${nearbyMatches.length} nearby matches`);
    }

    // Return results
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
    console.error('Error searching service posts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search service posts',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ============================================
// ADD THIS TO YOUR servicePosts.ts FILE
// Place it after the search endpoint (around line 120)
// ============================================

// Get all service posts (for All Listings screen)
router.get('/api/service-posts/all', async (req: Request, res: Response): Promise<void> => {
  const pool: Pool = (req as any).pool;
  
  try {
    // Type-safe query parameter extraction
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
    const post_type = req.query.post_type as string | undefined;

    console.log('📋 Fetching all service posts, limit:', limit, 'offset:', offset);

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

    const params: (string | number)[] = [];
    let paramIndex = 1;

    // Optional filter by post_type
    if (post_type && (post_type === 'offer' || post_type === 'request')) {
      query += ` AND sp.post_type = $${paramIndex}`;
      params.push(post_type);
      paramIndex++;
    }

    query += ` ORDER BY sp.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    console.log('📊 All listings query:', query);
    console.log('📊 Query params:', params);

    const result = await pool.query(query, params);

    console.log(`✅ Found ${result.rows.length} active service posts`);

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) as total
      FROM service_posts
      WHERE status = 'active'
    `;
    const countParams: (string | number)[] = [];
    
    if (post_type && (post_type === 'offer' || post_type === 'request')) {
      countQuery += ' AND post_type = $1';
      countParams.push(post_type);
    }
    
    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);

    res.json({
      success: true,
      posts: result.rows,
      total: total,
      limit: limit,
      offset: offset,
      hasMore: (offset + result.rows.length) < total
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

// Get service categories
router.get('/api/service-categories', async (req: Request, res: Response): Promise<void> => {
  const pool: Pool = (req as any).pool;
  
  try {
    const result = await pool.query(`
      SELECT DISTINCT service_category 
      FROM service_posts 
      WHERE status = 'active'
      ORDER BY service_category
    `);

    const categories = result.rows.map((row: any) => row.service_category);

    // Add some default categories if database is empty
    const defaultCategories = [
      'Cleaning', 'Plumbing', 'Electrical', 'Landscaping',
      'Home Repair', 'Pet Care', 'Moving', 'Tutoring',
      'Photography', 'Catering', 'Beauty', 'Decoration', 'Tailoring'
    ];

    const allCategories = [...new Set([...categories, ...defaultCategories])].sort();

    res.json({
      success: true,
      categories: allCategories
    });

  } catch (error: unknown) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch categories'
    });
  }
});

// Create a new service post
router.post('/api/service-posts', async (req: Request, res: Response): Promise<void> => {
  const pool: Pool = (req as any).pool;
  
  try {
    const {
      user_id,
      poster_type,
      post_type,
      title,
      description,
      service_category,
      price_range,
      zip_code,
      phone_number,
      contact_email
    } = req.body;

    // Validate required fields
    if (!user_id || !title || !service_category || !contact_email) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: user_id, title, service_category, contact_email'
      });
      return;
    }

    // Get city and state from zip code if not provided
    let city: string | null = null;
    let state: string | null = null;

    if (zip_code) {
      try {
        const zipResponse = await fetch(`https://api.zippopotam.us/us/${zip_code}`);
        if (zipResponse.ok) {
          const zipData = await zipResponse.json();
          city = zipData.places[0]["place name"];
          state = zipData.places[0]["state abbreviation"];
        }
      } catch (zipError) {
        console.warn('Could not fetch location data for zip code:', zip_code);
      }
    }

    const insertQuery = `
      INSERT INTO service_posts (
        user_id, poster_type, post_type, title, description,
        service_category, price_range, zip_code, city, state,
        phone_number, contact_email, status, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'active', NOW())
      RETURNING *
    `;

    const values = [
      user_id,
      poster_type || 'customer',
      post_type || 'request',
      title,
      description,
      service_category,
      price_range,
      zip_code,
      city,
      state,
      phone_number,
      contact_email
    ];

    const result = await pool.query(insertQuery, values);

    console.log('Service post created:', result.rows[0]);

    res.status(201).json({
      success: true,
      post: result.rows[0],
      message: 'Service post created successfully'
    });

  } catch (error: unknown) {
    console.error('Error creating service post:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create service post',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get user profile
router.get('/api/users/:userId/profile', async (req: Request, res: Response): Promise<void> => {
  const pool: Pool = (req as any).pool;
  
  try {
    const { userId } = req.params;

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

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'User not found'
      });
      return;
    }

    const row = result.rows[0];

    const profile = {
      user: {
        user_id: row.user_id,
        email: row.email,
        user_type: row.user_type,
        created_at: row.created_at
      },
      customerProfile: row.customer_name ? {
        full_name: row.customer_name,
        phone_number: row.customer_phone,
        zip_code: row.customer_zip,
        city: row.customer_city,
        state: row.customer_state
      } : null,
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

export default router;