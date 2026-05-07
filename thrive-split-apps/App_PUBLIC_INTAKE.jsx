import React, { useState } from "react";
import { Send } from "lucide-react";
import { supabase } from "./supabase";
import "./styles.css";

const EMPTY_INTAKE_FORM = {
  athlete_first_name: "",
  athlete_last_name_1: "",
  dropdown_90c5: "",
  birth_year: "",
  position: "",
  school: "",
  parent_first_name: "",
  parent_last_name: "",
  email_1a31: "",
  phone_7aeb: "",
  years_of_experience: "",
  highest_level_played: "",
  what_does_the_athlete_want_to_improve: ""
};

export default function App() {
  const [formData, setFormData] = useState(EMPTY_INTAKE_FORM);
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  }

  async function submitIntakeForm(event) {
    event.preventDefault();
    setSaving(true);
    setStatus("");

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

    const missingField = requiredFields.find(field => !String(formData[field] || "").trim());

    if (missingField) {
      setSaving(false);
      setStatus("Please complete all required athlete and parent fields before submitting.");
      return;
    }

    const payload = {
      ...formData,
      status: "new",
      payment_status: "unpaid",
      source: "public_intake_app"
    };

    const { error } = await supabase.from("evaluation_submissions").insert([payload]);

    if (error) {
      setSaving(false);
      setStatus(`Could not submit evaluation request: ${error.message}`);
      return;
    }

    setFormData(EMPTY_INTAKE_FORM);
    setSaving(false);
    setStatus("Evaluation request submitted successfully. THRiVE will follow up with next steps.");
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <img src="/thrive-logo.png" alt="THRiVE Logo" className="logo" />
          <div className="brand-text">
            <strong>THRiVE</strong>
            <span>Player Intake</span>
          </div>
        </div>
      </header>

      {status && (
        <div className="status">
          {status}
        </div>
      )}

      <main className="page narrow">
        <section className="hero compact intake-hero">
          <div>
            <span>Public Evaluation Request</span>
            <h1>THRiVE Player Intake</h1>
            <p>
              Complete the athlete and parent information so THRiVE can place the player into the correct evaluation pathway.
            </p>
          </div>
        </section>

        <form className="formPanel" onSubmit={submitIntakeForm}>
          <SectionTitle>Athlete Information</SectionTitle>

          <div className="formGrid">
            <FormInput label="Athlete First Name" name="athlete_first_name" value={formData.athlete_first_name} onChange={handleChange} required />
            <FormInput label="Athlete Last Name" name="athlete_last_name_1" value={formData.athlete_last_name_1} onChange={handleChange} required />

            <div className="field">
              <label>Evaluation Group / Age Level *</label>
              <select name="dropdown_90c5" value={formData.dropdown_90c5} onChange={handleChange} required>
                <option value="">Select Evaluation Group</option>
                <option value="Grade 5/6">Grade 5/6</option>
                <option value="Grade 7/8">Grade 7/8</option>
                <option value="Grade 9/10">Grade 9/10</option>
                <option value="Grade 11/12/Prep/U1">Grade 11/12/Prep/U1</option>
              </select>
            </div>

            <FormInput label="Birth Year" name="birth_year" value={formData.birth_year} onChange={handleChange} placeholder="2010" required />

            <div className="field">
              <label>Position *</label>
              <select name="position" value={formData.position} onChange={handleChange} required>
                <option value="">Select Position</option>
                <option value="Guard">Guard</option>
                <option value="Forward">Forward</option>
                <option value="Post">Post</option>
              </select>
            </div>

            <FormInput label="School" name="school" value={formData.school} onChange={handleChange} />
          </div>

          <SectionTitle>Parent / Guardian Information</SectionTitle>

          <div className="formGrid">
            <FormInput label="Parent First Name" name="parent_first_name" value={formData.parent_first_name} onChange={handleChange} required />
            <FormInput label="Parent Last Name" name="parent_last_name" value={formData.parent_last_name} onChange={handleChange} required />
            <FormInput label="Parent Email" type="email" name="email_1a31" value={formData.email_1a31} onChange={handleChange} required />
            <FormInput label="Parent Phone" type="tel" name="phone_7aeb" value={formData.phone_7aeb} onChange={handleChange} required />
          </div>

          <SectionTitle>Basketball Background</SectionTitle>

          <div className="formGrid">
            <FormInput label="Years of Basketball Experience" name="years_of_experience" value={formData.years_of_experience} onChange={handleChange} />
            <FormInput label="Highest Level Played" name="highest_level_played" value={formData.highest_level_played} onChange={handleChange} />
          </div>

          <div className="field full">
            <label>What does the athlete want to improve?</label>
            <textarea
              name="what_does_the_athlete_want_to_improve"
              value={formData.what_does_the_athlete_want_to_improve}
              onChange={handleChange}
              placeholder="Example: shooting confidence, ball handling, finishing, defensive footwork, decision-making..."
            />
          </div>

          <button className="submitBtn" disabled={saving}>
            <Send size={18} /> {saving ? "Submitting..." : "Submit Evaluation Request"}
          </button>
        </form>
      </main>
    </div>
  );
}

function FormInput({ label, name, value, onChange, type = "text", placeholder = "", required = false }) {
  return (
    <div className="field">
      <label>{label}{required ? " *" : ""}</label>
      <input type={type} name={name} value={value} onChange={onChange} placeholder={placeholder} required={required} />
    </div>
  );
}

function SectionTitle({ children }) {
  return <h2 className="sectionTitle">{children}</h2>;
}
