import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const webhookSecret = process.env.WIX_WEBHOOK_SECRET;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

function clean(value) {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed. Use POST."
    });
  }

  try {
    const secretFromWix =
      req.headers["x-thrive-webhook-secret"] ||
      req.headers["X-THRIVE-WEBHOOK-SECRET"] ||
      req.body?.webhook_secret;

    if (webhookSecret && secretFromWix !== webhookSecret) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized webhook request."
      });
    }

    const body = req.body || {};

    const payload = {
      athlete_first_name: clean(body.athlete_first_name),
      athlete_last_name_1: clean(body.athlete_last_name_1),
      dropdown_90c5: clean(body.dropdown_90c5),
      birth_year: clean(body.birth_year),
      position: clean(body.position),
      school: clean(body.school),

      parent_first_name: clean(body.parent_first_name),
      parent_last_name: clean(body.parent_last_name),
      email_1a31: clean(body.email_1a31),
      phone_7aeb: clean(body.phone_7aeb),

      years_of_experience: clean(body.years_of_experience),
      highest_level_played: clean(body.highest_level_played),
      what_does_the_athlete_want_to_improve: clean(body.what_does_the_athlete_want_to_improve),

      status: clean(body.status) || "new",
      payment_status: clean(body.payment_status) || "paid",
      source: "wix_webhook"
    };

    const requiredFields = [
      "athlete_first_name",
      "athlete_last_name_1",
      "dropdown_90c5",
      "birth_year",
      "position",
      "parent_first_name",
      "parent_last_name",
      "email_1a31",
      "phone_7aeb"
    ];

    const missingFields = requiredFields.filter(field => !payload[field]);

    if (missingFields.length) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields.",
        missingFields
      });
    }

    const { data, error } = await supabase
      .from("evaluation_submissions")
      .insert([payload])
      .select()
      .single();

    if (error) {
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }

    return res.status(200).json({
      success: true,
      message: "Wix evaluation submission saved.",
      id: data.id
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || "Unexpected server error."
    });
  }
}
