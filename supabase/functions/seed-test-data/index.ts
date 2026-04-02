import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceRoleKey);

    // Create test business users
    const businessUsers = [
      { email: "plumber.joe@test.com", password: "TestPass123!", name: "Joe's Plumbing Pro", city: "New York", country: "US", description: "Expert plumbing services for residential and commercial properties. 15+ years experience.", serviceAreas: ["Manhattan", "Brooklyn", "Queens"], officeAddress: "123 Main St, New York, NY 10001" },
      { email: "spark.electric@test.com", password: "TestPass123!", name: "Spark Electric Co", city: "Los Angeles", country: "US", description: "Licensed electricians providing quality electrical work. Available 24/7 for emergencies.", serviceAreas: ["Hollywood", "Santa Monica", "Downtown LA", "Beverly Hills"], officeAddress: "456 Sunset Blvd, Los Angeles, CA 90028" },
      { email: "green.gardens@test.com", password: "TestPass123!", name: "Green Gardens Landscaping", city: "London", country: "GB", description: "Transform your outdoor space with our professional landscaping services.", serviceAreas: ["Westminster", "Camden", "Kensington", "Chelsea"], officeAddress: "78 Garden Lane, London SW1A 1AA" },
    ];

    const createdBusinessIds: string[] = [];

    for (const biz of businessUsers) {
      // Create user
      const { data: userData, error: userError } = await admin.auth.admin.createUser({
        email: biz.email,
        password: biz.password,
        email_confirm: true,
        user_metadata: { full_name: biz.name, role: "business" },
      });

      if (userError) {
        if (userError.message?.includes("already been registered")) continue;
        throw userError;
      }

      const userId = userData.user!.id;

      // Create business
      const { data: bizData, error: bizError } = await admin.from("businesses").insert({
        owner_id: userId,
        name: biz.name,
        city: biz.city,
        country: biz.country,
        description: biz.description,
        phone: "+15551234567",
        email: biz.email,
        office_address: biz.officeAddress,
        service_areas: biz.serviceAreas,
        verification_status: "approved",
        is_active: true,
        operating_hours: {
          Monday: { open: "08:00", close: "18:00", closed: false },
          Tuesday: { open: "08:00", close: "18:00", closed: false },
          Wednesday: { open: "08:00", close: "18:00", closed: false },
          Thursday: { open: "08:00", close: "18:00", closed: false },
          Friday: { open: "08:00", close: "17:00", closed: false },
          Saturday: { open: "09:00", close: "14:00", closed: false },
          Sunday: { open: "00:00", close: "00:00", closed: true },
        },
      }).select("id").single();

      if (bizError) throw bizError;
      createdBusinessIds.push(bizData.id);
    }

    // Add services for created businesses
    const servicesByBusiness = [
      // Joe's Plumbing
      [
        { title: "Pipe Repair", description: "Fix leaky or burst pipes quickly and affordably", base_price: 120, category: "plumbing" },
        { title: "Drain Cleaning", description: "Professional drain unclogging and cleaning service", base_price: 85, category: "plumbing" },
        { title: "Water Heater Installation", description: "Install or replace your water heater with expert care", base_price: 350, category: "plumbing" },
        { title: "Bathroom Renovation", description: "Complete bathroom plumbing renovation", base_price: 1500, category: "plumbing" },
      ],
      // Spark Electric
      [
        { title: "Electrical Panel Upgrade", description: "Upgrade your electrical panel for safety and capacity", base_price: 800, category: "electrical" },
        { title: "Light Fixture Installation", description: "Install indoor/outdoor lighting fixtures", base_price: 95, category: "electrical" },
        { title: "Outlet & Switch Repair", description: "Fix faulty outlets and switches", base_price: 75, category: "electrical" },
        { title: "Emergency Electrical Service", description: "24/7 emergency electrical repairs", base_price: 200, category: "electrical" },
      ],
      // Green Gardens
      [
        { title: "Garden Design & Planting", description: "Custom garden design with professional planting", base_price: 500, category: "landscaping" },
        { title: "Lawn Maintenance", description: "Regular mowing, edging, and lawn care", base_price: 60, category: "landscaping" },
        { title: "Tree Pruning", description: "Professional tree and hedge trimming", base_price: 180, category: "landscaping" },
        { title: "Patio Installation", description: "Beautiful patio design and installation", base_price: 2000, category: "landscaping" },
      ],
    ];

    for (let i = 0; i < createdBusinessIds.length; i++) {
      const bizId = createdBusinessIds[i];
      const services = servicesByBusiness[i];
      if (!bizId || !services) continue;

      for (const svc of services) {
        await admin.from("services").insert({
          business_id: bizId,
          ...svc,
        });
      }
    }

    // Create test customer
    const { error: custError } = await admin.auth.admin.createUser({
      email: "customer.test@test.com",
      password: "TestPass123!",
      email_confirm: true,
      user_metadata: { full_name: "Test Customer", role: "customer" },
    });

    if (custError && !custError.message?.includes("already been registered")) {
      throw custError;
    }

    return new Response(JSON.stringify({
      success: true,
      message: "Test data created successfully",
      accounts: [
        ...businessUsers.map(b => ({ email: b.email, password: b.password, role: "business", name: b.name })),
        { email: "customer.test@test.com", password: "TestPass123!", role: "customer", name: "Test Customer" },
      ],
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
