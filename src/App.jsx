import React, { useEffect, useMemo, useState } from "react";
import {
  Archive,
  BarChart3,
  CalendarCheck,
  CheckCircle2,
  ClipboardList,
  Clock,
  LogOut,
  Mail,
  Plus,
  RefreshCw,
  Search,
  Send,
  Trophy,
  Users,
  UserPlus
} from "lucide-react";
import { supabase } from "./supabase";
import "./styles.css";

const CATEGORIES = [
  { key: "shooting", label: "Shooting", desc: "Shot mechanics, range, efficiency", icon: "🏀" },
  { key: "ball_handling", label: "Ball Handling", desc: "Dribbling, control, pressure handling", icon: "✋" },
  { key: "defense", label: "Defense", desc: "On-ball, help-side, effort, IQ", icon: "🛡️" },
  { key: "athleticism", label: "Athleticism", desc: "Speed, strength, mobility, motor", icon: "⚡" },
  { key: "basketball_iq", label: "Basketball IQ", desc: "Reads, spacing, decisions, awareness", icon: "🧠" },
  { key: "finishing", label: "Finishing", desc: "Footwork, touch, contact, creativity", icon: "🎯" }
];

const REQUEST_STATUSES = [
  { key: "active", label: "Active", short: "Active" },
  { key: "new", label: "New Request", short: "New" },
  { key: "contacted", label: "Contacted", short: "Contacted" },
  { key: "waiting_reply", label: "Waiting for Reply", short: "Waiting" },
  { key: "evaluation_interested", label: "Evaluation Interested", short: "Interested" },
  { key: "evaluation_booked", label: "Evaluation Booked", short: "Booked" },
  { key: "archived", label: "Archived", short: "Archived" },
  { key: "all", label: "All Requests", short: "All" }
];

const ACTIVE_REQUEST_STATUSES = ["new", "waiting_reply", "evaluation_interested"];

const REQUEST_STATUS_LABELS = REQUEST_STATUSES.reduce((acc, status) => {
  acc[status.key] = status.label;
  return acc;
}, {});

const WEIGHTS = {
  Guard: { shooting: 0.22, ball_handling: 0.22, defense: 0.14, athleticism: 0.14, basketball_iq: 0.18, finishing: 0.1 },
  Forward: { shooting: 0.18, ball_handling: 0.14, defense: 0.18, athleticism: 0.18, basketball_iq: 0.16, finishing: 0.16 },
  Post: { shooting: 0.1, ball_handling: 0.1, defense: 0.22, athleticism: 0.18, basketball_iq: 0.16, finishing: 0.24 }
};

const COACHES = [
  "Coach Nowrang",
  "Coach Sim",
  "Coach Matt",
  "Coach Mario",
  "Coach Crue",
  "Coach Amanda",
  "Coach Joaquin",
  "Coach Riley"
];

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

function getPlacement(score) {
  if (score >= 8.6) return "Next Level";
  if (score >= 7.1) return "Elite";
  if (score >= 5.6) return "Advanced";
  return "Foundations";
}

function playerName(player) {
  return player?.full_name || `${player?.first_name || ""} ${player?.last_name || ""}`.trim();
}

function pick(...values) {
  return values.find(value => value !== undefined && value !== null && String(value).trim() !== "") || "";
}

function requestAthleteName(request) {
  return `${pick(request?.athlete_first_name, request?.player_first_name)} ${pick(request?.athlete_last_name, request?.athlete_last_name_1, request?.player_last_name)}`.trim() || "Unnamed Athlete";
}

function requestParentName(request) {
  return `${request?.parent_first_name || ""} ${request?.parent_last_name || ""}`.trim() || "Parent / Guardian";
}

function requestEmail(request) {
  return pick(request?.parent_email, request?.email, request?.email_1a31);
}

function requestPhone(request) {
  return pick(request?.parent_phone, request?.phone, request?.phone_7aeb);
}

function phoneHref(phone) {
  const cleaned = String(phone || "").replace(/[^+\d]/g, "");
  return cleaned ? `tel:${cleaned}` : "";
}

function emailHref(email) {
  const cleaned = String(email || "").trim();
  return cleaned ? `mailto:${cleaned}` : "";
}

function requestGrade(request) {
  return pick(request?.grade, request?.dropdown_90c5, request?.grade);
}

function requestImprovementGoals(request) {
  return pick(request?.improvement_goals, request?.improvement_goal, request?.what_does_the_athlete_want_to_improve);
}

function normalizeRequestStatus(status) {
  if (!status) return "new";
  const cleaned = String(status).toLowerCase().trim().replace(/\s+/g, "_");
  if (cleaned === "waiting") return "waiting_reply";
  if (cleaned === "interested") return "evaluation_interested";
  if (cleaned === "booked") return "evaluation_booked";
  if (REQUEST_STATUS_LABELS[cleaned]) return cleaned;
  return "new";
}

function emptyScores() {
  return CATEGORIES.reduce((acc, cat) => ({ ...acc, [cat.key]: 5 }), {});
}

export default function App() {
  const [view, setView] = useState("dashboard");
  const [players, setPlayers] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [evaluationRequests, setEvaluationRequests] = useState([]);
  const [coaches, setCoaches] = useState([]);
  const [coachForm, setCoachForm] = useState({ email: "", role: "coach" });
  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [search, setSearch] = useState("");
  const [requestFilter, setRequestFilter] = useState("active");
  const [selectedRequestId, setSelectedRequestId] = useState("");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");

  const [formData, setFormData] = useState(EMPTY_INTAKE_FORM);

  const [playerForm, setPlayerForm] = useState({
    first_name: "",
    last_name: "",
    birth_year: "",
    grade: "",
    position: "",
    school: ""
  });

  const [evalForm, setEvalForm] = useState({
    coach_name: "",
    evaluation_type: "Initial Evaluation",
    evaluation_date: new Date().toISOString().slice(0, 10),
    position: "",
    strengths: "",
    challenges: "",
    next_steps: ""
  });

  const [scores, setScores] = useState(emptyScores());

  useEffect(() => {
    let mounted = true;

    async function initializeAuth() {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(data.session || null);
      setAuthLoading(false);
    }

    initializeAuth();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession || null);
      if (!nextSession) {
        setPlayers([]);
        setEvaluations([]);
        setEvaluationRequests([]);
        setCoaches([]);
      }
    });

    return () => {
      mounted = false;
      listener?.subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (session) {
      loadData();
    }
  }, [session]);

  async function signInCoach(event) {
    event.preventDefault();
    setAuthError("");
    setStatus("");
    setSaving(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: authEmail.trim(),
      password: authPassword
    });

    setSaving(false);

    if (error) {
      setAuthError(error.message);
      return;
    }

    setSession(data.session || null);
  }

  async function signOutCoach() {
    setStatus("");
    await supabase.auth.signOut();
    setSession(null);
  }

  async function loadData() {
    setStatus("Loading...");

    const [playersResult, evaluationsResult, requestsResult, coachesResult] = await Promise.all([
      supabase.from("players").select("*").order("last_name", { ascending: true }),
      supabase
        .from("evaluations")
        .select("*, players(first_name,last_name,grade,position,school)")
        .order("created_at", { ascending: false }),
      supabase
        .from("evaluation_submissions")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("coach_profiles")
        .select("id,user_id,email,role,active,created_at")
        .order("created_at", { ascending: false })
    ]);

    if (playersResult.error) {
      setStatus(`Player load error: ${playersResult.error.message}`);
      return;
    }

    if (evaluationsResult.error) {
      setStatus(`Evaluation load error: ${evaluationsResult.error.message}`);
      return;
    }

    if (requestsResult.error) {
      setStatus(`Evaluation request load error: ${requestsResult.error.message}`);
      return;
    }

    setPlayers(playersResult.data || []);
    setEvaluations(evaluationsResult.data || []);
    setEvaluationRequests((requestsResult.data || []).map(request => ({
      ...request,
      status: normalizeRequestStatus(request.status)
    })));

    if (coachesResult.error) {
      setCoaches([]);
      setStatus(`Coach profile load warning: ${coachesResult.error.message}`);
      return;
    }

    setCoaches(coachesResult.data || []);
    setStatus("");
  }

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
      athlete_first_name: formData.athlete_first_name,
      athlete_last_name: formData.athlete_last_name_1,
      grade: formData.dropdown_90c5,
      birth_year: formData.birth_year,
      position: formData.position,
      school: formData.school,
      parent_first_name: formData.parent_first_name,
      parent_last_name: formData.parent_last_name,
      parent_email: formData.email_1a31,
      parent_phone: formData.phone_7aeb,
      years_of_experience: formData.years_of_experience,
      highest_level_played: formData.highest_level_played,
      improvement_goals: formData.what_does_the_athlete_want_to_improve,
      status: "new"
    };

    const { error } = await supabase.from("evaluation_submissions").insert([payload]);

    if (error) {
      setSaving(false);
      setStatus(`Could not submit evaluation request: ${error.message}`);
      return;
    }

    setFormData(EMPTY_INTAKE_FORM);
    setSaving(false);
    setStatus("Evaluation request submitted successfully.");
    await loadData();
    setView("dashboard");
  }

  async function updateRequestStatus(id, nextStatus) {
    setStatus("");
    const normalizedStatus = normalizeRequestStatus(nextStatus);
    const now = new Date().toISOString();

    const payload = {
      status: normalizedStatus,
      updated_at: now
    };

    if (["contacted", "waiting_reply", "evaluation_interested", "evaluation_booked"].includes(normalizedStatus)) {
      payload.contacted_at = now;
    }

    if (normalizedStatus === "archived") {
      payload.archived_at = now;
    }

    const { data, error } = await supabase
      .from("evaluation_submissions")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      setStatus(`Could not update request status: ${error.message}`);
      return false;
    }

    setEvaluationRequests(prev =>
      prev.map(request => request.id === id ? { ...request, ...data, status: normalizeRequestStatus(data.status) } : request)
    );

    return true;
  }

  async function markAllVisibleWaiting() {
    const visibleIds = filteredRequests
      .filter(request => request.status !== "archived" && request.status !== "evaluation_booked")
      .map(request => request.id);

    if (!visibleIds.length) return;

    const confirmed = window.confirm(`Move ${visibleIds.length} visible requests to Waiting for Reply?`);
    if (!confirmed) return;

    setSaving(true);
    setStatus("");

    const now = new Date().toISOString();
    const { error } = await supabase
      .from("evaluation_submissions")
      .update({
        status: "waiting_reply",
        contacted_at: now,
        updated_at: now
      })
      .in("id", visibleIds);

    if (error) {
      setSaving(false);
      setStatus(`Could not update visible requests: ${error.message}`);
      return;
    }

    setEvaluationRequests(prev =>
      prev.map(request =>
        visibleIds.includes(request.id)
          ? { ...request, status: "waiting_reply", contacted_at: now, updated_at: now }
          : request
      )
    );

    setSaving(false);
    setStatus(`${visibleIds.length} requests moved to Waiting for Reply.`);
    setRequestFilter("waiting_reply");
  }

  const selectedPlayer = useMemo(
    () => players.find(player => player.id === selectedPlayerId),
    [players, selectedPlayerId]
  );

  useEffect(() => {
    if (!selectedPlayer) return;
    setEvalForm(prev => ({ ...prev, position: selectedPlayer.position || prev.position }));
  }, [selectedPlayer]);

  const scoreSummary = useMemo(() => {
    const raw = CATEGORIES.reduce((sum, cat) => sum + Number(scores[cat.key] || 0), 0) / CATEGORIES.length;
    const position = evalForm.position || selectedPlayer?.position || "Guard";
    const weights = WEIGHTS[position] || WEIGHTS.Guard;
    const weighted = CATEGORIES.reduce((sum, cat) => sum + Number(scores[cat.key] || 0) * weights[cat.key], 0);

    return {
      raw: Number(raw.toFixed(1)),
      weighted: Number(weighted.toFixed(1)),
      ovr: Math.round(weighted * 9.9),
      placement: getPlacement(weighted)
    };
  }, [scores, evalForm.position, selectedPlayer]);

  const dashboardStats = useMemo(() => {
    const uniquePlayers = new Set(evaluations.map(evaluation => evaluation.player_id)).size;
    const avg = evaluations.length
      ? evaluations.reduce((sum, evaluation) => sum + Number(evaluation.weighted_score || 0), 0) / evaluations.length
      : 0;
    const placements = evaluations.reduce(
      (acc, evaluation) => ({ ...acc, [evaluation.placement]: (acc[evaluation.placement] || 0) + 1 }),
      {}
    );
    const topPlacement = Object.entries(placements).sort((a, b) => b[1] - a[1])[0]?.[0] || "-";

    return { total: evaluations.length, uniquePlayers, avg: avg.toFixed(1), topPlacement };
  }, [evaluations]);

  const requestStats = useMemo(() => {
    const counts = evaluationRequests.reduce((acc, request) => {
      const key = normalizeRequestStatus(request.status);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const activeTotal = ACTIVE_REQUEST_STATUSES.reduce((sum, key) => sum + (counts[key] || 0), 0);

    return {
      total: evaluationRequests.length,
      active: activeTotal,
      new: counts.new || 0,
      contacted: counts.contacted || 0,
      waiting_reply: counts.waiting_reply || 0,
      evaluation_interested: counts.evaluation_interested || 0,
      evaluation_booked: counts.evaluation_booked || 0,
      archived: counts.archived || 0
    };
  }, [evaluationRequests]);

  const filteredRequests = useMemo(() => {
    const term = search.toLowerCase().trim();

    return evaluationRequests.filter(request => {
      const requestStatus = normalizeRequestStatus(request.status);
      const matchesFilter =
        requestFilter === "all" ||
        (requestFilter === "active" && ACTIVE_REQUEST_STATUSES.includes(requestStatus)) ||
        requestStatus === requestFilter;

      const searchable = [
        requestAthleteName(request),
        requestParentName(request),
        requestEmail(request),
        requestPhone(request),
        requestGrade(request),
        request.birth_year,
        request.position,
        request.school,
        request.years_of_experience,
        request.highest_level_played,
        requestImprovementGoals(request),
        REQUEST_STATUS_LABELS[requestStatus]
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return matchesFilter && (!term || searchable.includes(term));
    });
  }, [evaluationRequests, requestFilter, search]);

  const selectedRequest = useMemo(() => {
    if (!filteredRequests.length) return null;
    return filteredRequests.find(request => request.id === selectedRequestId) || filteredRequests[0];
  }, [filteredRequests, selectedRequestId]);

  const filteredEvaluations = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return evaluations;

    return evaluations.filter(evaluation =>
      playerName(evaluation.players || {}).toLowerCase().includes(term) ||
      evaluation.coach_name?.toLowerCase().includes(term) ||
      evaluation.placement?.toLowerCase().includes(term)
    );
  }, [evaluations, search]);

  async function addCoachProfile(event) {
    event.preventDefault();
    const email = coachForm.email.trim().toLowerCase();

    if (!email) {
      setStatus("Enter the coach email before adding access.");
      return;
    }

    setSaving(true);
    setStatus("");

    const { error } = await supabase.rpc("add_thrive_coach", {
      coach_email: email,
      coach_role: coachForm.role
    });

    if (error) {
      setSaving(false);
      setStatus(`Could not add coach: ${error.message}`);
      return;
    }

    setCoachForm({ email: "", role: "coach" });
    await loadData();
    setSaving(false);
    setStatus("Coach access updated.");
  }

  async function setCoachActive(coach, active) {
    if (!coach?.email) return;

    const action = active ? "reactivate" : "deactivate";
    const confirmed = window.confirm(`Are you sure you want to ${action} ${coach.email}?`);
    if (!confirmed) return;

    setSaving(true);
    setStatus("");

    const { error } = await supabase.rpc("set_thrive_coach_active", {
      coach_email: coach.email,
      coach_active: active
    });

    if (error) {
      setSaving(false);
      setStatus(`Could not update coach access: ${error.message}`);
      return;
    }

    await loadData();
    setSaving(false);
    setStatus(active ? "Coach reactivated." : "Coach deactivated.");
  }

  async function createPlayer(event) {
    event.preventDefault();
    setSaving(true);
    setStatus("");

    const payload = {
      ...playerForm,
      birth_year: playerForm.birth_year ? Number(playerForm.birth_year) : null
    };

    const { data, error } = await supabase.from("players").insert([payload]).select().single();

    if (error) {
      setSaving(false);
      setStatus(`Could not create player: ${error.message}`);
      return;
    }

    setPlayers(prev => [...prev, data].sort((a, b) => a.last_name.localeCompare(b.last_name)));
    setSelectedPlayerId(data.id);
    setPlayerForm({ first_name: "", last_name: "", birth_year: "", grade: "", position: "", school: "" });
    setSaving(false);
    setStatus("Player created.");
    setView("evaluate");
  }

  async function submitEvaluation(event) {
    event.preventDefault();
    setSaving(true);
    setStatus("");

    if (!selectedPlayerId) {
      setSaving(false);
      setStatus("Select a player before submitting.");
      return;
    }

    if (!evalForm.coach_name || !evalForm.evaluation_date || !evalForm.position) {
      setSaving(false);
      setStatus("Coach, date, and position are required.");
      return;
    }

    const payload = {
      player_id: selectedPlayerId,
      ...evalForm,
      ...scores,
      raw_average: scoreSummary.raw,
      weighted_score: scoreSummary.weighted,
      ovr: scoreSummary.ovr,
      placement: scoreSummary.placement
    };

    const { error } = await supabase.from("evaluations").insert([payload]);

    if (error) {
      setSaving(false);
      setStatus(`Could not save evaluation: ${error.message}`);
      return;
    }

    setStatus("Evaluation saved.");
    setScores(emptyScores());
    setEvalForm({
      coach_name: evalForm.coach_name,
      evaluation_type: "Initial Evaluation",
      evaluation_date: new Date().toISOString().slice(0, 10),
      position: selectedPlayer?.position || "",
      strengths: "",
      challenges: "",
      next_steps: ""
    });

    await loadData();
    setSaving(false);
    setView("dashboard");
  }

  if (authLoading) {
    return (
      <div className="app loginShell">
        <div className="loginCard">
          <img src="/thrive-logo.png" alt="THRiVE Logo" className="loginLogo" />
          <h1>Loading THRiVE Coach System...</h1>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <LoginScreen
        email={authEmail}
        setEmail={setAuthEmail}
        password={authPassword}
        setPassword={setAuthPassword}
        authError={authError}
        signInCoach={signInCoach}
        saving={saving}
      />
    );
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <img src="/thrive-logo.png" alt="THRiVE Logo" className="logo" />
          <div className="brand-text coach-system-only">
            <strong>COACH SYSTEM</strong>
          </div>
        </div>

        <nav>
          <button className={view === "dashboard" ? "active" : ""} onClick={() => setView("dashboard")}>
            <BarChart3 size={17} /> Request Pipeline
          </button>
          <button className={view === "intake" ? "active" : ""} onClick={() => setView("intake")}>
            <Send size={17} /> Intake Form
          </button>
          <button className={view === "coaches" ? "active" : ""} onClick={() => setView("coaches")}>
            <Users size={17} /> Coaches
          </button>
          <button className={view === "evaluate" ? "active" : ""} onClick={() => setView("evaluate")}>
            <ClipboardList size={17} /> New Evaluation
          </button>
          <button className={view === "player" ? "active" : ""} onClick={() => setView("player")}>
            <UserPlus size={17} /> Add Player
          </button>
        </nav>

        <button className="logoutBtn" type="button" onClick={signOutCoach}>
          <LogOut size={16} /> Sign Out
        </button>
      </header>

      {status && <div className="status">{status}</div>}

      {view === "intake" && (
        <IntakeForm
          formData={formData}
          handleChange={handleChange}
          submitIntakeForm={submitIntakeForm}
          saving={saving}
        />
      )}

      {view === "dashboard" && (
        <Dashboard
          requestStats={requestStats}
          requests={filteredRequests}
          requestFilter={requestFilter}
          setRequestFilter={setRequestFilter}
          search={search}
          setSearch={setSearch}
          refresh={loadData}
          updateRequestStatus={updateRequestStatus}
          markAllVisibleWaiting={markAllVisibleWaiting}
          selectedRequest={selectedRequest}
          selectedRequestId={selectedRequest?.id || ""}
          setSelectedRequestId={setSelectedRequestId}
          saving={saving}
        />
      )}

      {view === "coaches" && (
        <CoachManagement
          coaches={coaches}
          coachForm={coachForm}
          setCoachForm={setCoachForm}
          addCoachProfile={addCoachProfile}
          setCoachActive={setCoachActive}
          saving={saving}
          refresh={loadData}
        />
      )}

      {view === "evaluate" && (
        <EvaluationForm
          players={players}
          selectedPlayerId={selectedPlayerId}
          setSelectedPlayerId={setSelectedPlayerId}
          selectedPlayer={selectedPlayer}
          evalForm={evalForm}
          setEvalForm={setEvalForm}
          scores={scores}
          setScores={setScores}
          scoreSummary={scoreSummary}
          submitEvaluation={submitEvaluation}
          saving={saving}
        />
      )}

      {view === "player" && (
        <PlayerForm
          playerForm={playerForm}
          setPlayerForm={setPlayerForm}
          createPlayer={createPlayer}
          saving={saving}
        />
      )}

      {view === "history" && (
        <EvaluationHistory
          stats={dashboardStats}
          evaluations={filteredEvaluations}
          search={search}
          setSearch={setSearch}
          refresh={loadData}
        />
      )}
    </div>
  );
}

function LoginScreen({ email, setEmail, password, setPassword, authError, signInCoach, saving }) {
  return (
    <div className="app loginShell">
      <main className="loginCard">
        <div className="brand loginBrand">
          <img src="/thrive-logo.png" alt="THRiVE Logo" className="loginLogo" />
          <div className="brand-text">
            <strong>THRiVE</strong>
            <span>Coach System</span>
          </div>
        </div>

        <div className="loginIntro">
          <span>Secure Coach Access</span>
          <h1>THRiVE Coach Login</h1>
          <p>Sign in with an approved coach account to access the Evaluation Request Dashboard.</p>
        </div>

        <form className="loginForm" onSubmit={signInCoach}>
          <div className="field full">
            <label>Coach Email</label>
            <input
              type="email"
              value={email}
              onChange={event => setEmail(event.target.value)}
              placeholder="coach@thrivebasketball.org"
              autoComplete="email"
              required
            />
          </div>

          <div className="field full">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={event => setPassword(event.target.value)}
              placeholder="Enter password"
              autoComplete="current-password"
              required
            />
          </div>

          {authError && <div className="authError">{authError}</div>}

          <button className="submitBtn" disabled={saving}>
            {saving ? "Signing In..." : "Sign In"}
          </button>
        </form>
      </main>
    </div>
  );
}

function IntakeForm({ formData, handleChange, submitIntakeForm, saving }) {
  return (
    <main className="page narrow">
      <section className="hero compact">
        <div>
          <span>Evaluation Request</span>
          <h1>THRiVE Player Intake</h1>
          <p>Complete the athlete and parent information so THRiVE can place the player into the correct evaluation pathway.</p>
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
  );
}

function Dashboard({
  requestStats,
  requests,
  requestFilter,
  setRequestFilter,
  search,
  setSearch,
  refresh,
  updateRequestStatus,
  markAllVisibleWaiting,
  selectedRequest,
  selectedRequestId,
  setSelectedRequestId,
  saving
}) {
  return (
    <main className="page dashboardPage">
      <section className="dashboardHero">
        <div>
          <span>Coach Dashboard</span>
          <h1>Evaluation Request Dashboard</h1>
          <p>Compact request rows, quick status movement, and a clean detail panel for coach follow-up.</p>
        </div>
        <div className="heroActions">
          <button className="ghostBtn" onClick={markAllVisibleWaiting} disabled={saving || !requests.length}>
            <Clock size={17} /> Move Visible to Waiting
          </button>
          <button className="goldBtn" onClick={refresh}>
            <RefreshCw size={17} /> Refresh
          </button>
        </div>
      </section>

      <section className="statGrid requestStats compactStats" aria-label="Evaluation request quick filters">
        <Metric
          title="Active"
          value={requestStats.active}
          sub="New / waiting / interested"
          active={requestFilter === "active"}
          onClick={() => setRequestFilter("active")}
        />
        <Metric
          title="New"
          value={requestStats.new}
          sub="Needs first contact"
          active={requestFilter === "new"}
          onClick={() => setRequestFilter("new")}
        />
        <Metric
          title="Waiting"
          value={requestStats.waiting_reply}
          sub="Follow-up needed"
          active={requestFilter === "waiting_reply"}
          onClick={() => setRequestFilter("waiting_reply")}
        />
        <Metric
          title="Booked"
          value={requestStats.evaluation_booked}
          sub="Evaluation sessions"
          active={requestFilter === "evaluation_booked"}
          onClick={() => setRequestFilter("evaluation_booked")}
        />
      </section>

      <section className="pipelineShell">
        <div className="pipelineMain panel">
          <div className="pipelineHeader">
            <div>
              <h2>Request Pipeline</h2>
              <p className="panelSubtext">Select a row to view full parent/player details.</p>
            </div>
            <div className="searchBox pipelineSearch">
              <Search size={16} />
              <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search athlete, parent, grade, birth year..." />
            </div>
          </div>

          <div className="filterBar compactFilters">
            {REQUEST_STATUSES.map(status => (
              <button
                key={status.key}
                className={requestFilter === status.key ? "active" : ""}
                onClick={() => setRequestFilter(status.key)}
                type="button"
              >
                {status.short}
                <strong>{requestStats[status.key] ?? requestStats.total}</strong>
              </button>
            ))}
          </div>

          <div className="compactRequestList">
            {requests.map(request => (
              <RequestRow
                key={request.id}
                request={request}
                selected={selectedRequestId === request.id}
                onSelect={() => setSelectedRequestId(request.id)}
                updateRequestStatus={updateRequestStatus}
              />
            ))}

            {!requests.length && <div className="empty">No requests match this view.</div>}
          </div>
        </div>

        <RequestDetailPanel request={selectedRequest} updateRequestStatus={updateRequestStatus} />
      </section>
    </main>
  );
}

function RequestRow({ request, selected, onSelect, updateRequestStatus }) {
  const statusKey = normalizeRequestStatus(request.status);
  const submitted = request.created_at
    ? new Date(request.created_at).toLocaleDateString("en-CA")
    : "-";

  return (
    <article className={`compactRequestRow ${selected ? "selected" : ""}`} onClick={onSelect}>
      <div className="requestIdentity">
        <strong>{requestAthleteName(request)}</strong>
        <span>{requestGrade(request)} • {request.birth_year || "Birth year -"} • {request.position || "Position -"}</span>
      </div>

      <div className="requestParentMini">
        <strong>{requestParentName(request)}</strong>
        <span>{requestPhone(request) || "No phone"}</span>
      </div>

      <div className="requestSubmittedMini">
        <span>Submitted</span>
        <strong>{submitted}</strong>
      </div>

      <RequestStatusBadge status={statusKey} />

      <div className="rowQuickActions" onClick={event => event.stopPropagation()}>
        <button type="button" title="Contacted" onClick={() => updateRequestStatus(request.id, "contacted")}>
          <CheckCircle2 size={14} />
        </button>
        <button type="button" title="Waiting" onClick={() => updateRequestStatus(request.id, "waiting_reply")}>
          <Clock size={14} />
        </button>
        <button type="button" title="Interested" onClick={() => updateRequestStatus(request.id, "evaluation_interested")}>
          <Trophy size={14} />
        </button>
        <button type="button" title="Booked" onClick={() => updateRequestStatus(request.id, "evaluation_booked")}>
          <CalendarCheck size={14} />
        </button>
      </div>
    </article>
  );
}

function RequestDetailPanel({ request, updateRequestStatus }) {
  if (!request) {
    return (
      <aside className="requestDetailPanel panel">
        <h2>Selected Request</h2>
        <div className="empty">Select a request to see full details.</div>
      </aside>
    );
  }

  const statusKey = normalizeRequestStatus(request.status);
  const submitted = request.created_at ? new Date(request.created_at).toLocaleString("en-CA") : "-";

  return (
    <aside className="requestDetailPanel panel">
      <div className="detailTop">
        <div>
          <span>Selected Request</span>
          <h2>{requestAthleteName(request)}</h2>
        </div>
        <RequestStatusBadge status={statusKey} />
      </div>

      <div className="detailGrid">
        <DetailItem label="Grade / Group" value={requestGrade(request)} />
        <DetailItem label="Birth Year" value={request.birth_year || "-"} />
        <DetailItem label="Position" value={request.position || "-"} />
        <DetailItem label="Submitted" value={submitted} />
        <DetailItem label="Parent / Guardian" value={requestParentName(request)} />
        <DetailItem label="Email" value={requestEmail(request) || "-"} href={emailHref(requestEmail(request))} />
        <DetailItem label="Phone" value={requestPhone(request) || "-"} href={phoneHref(requestPhone(request))} />
        <DetailItem label="School" value={request.school || "-"} />
        <DetailItem label="Experience" value={request.years_of_experience || "-"} />
        <DetailItem label="Highest Level" value={request.highest_level_played || "-"} />
      </div>

      <div className="detailNote">
        <small>Improvement Goals</small>
        <p>{requestImprovementGoals(request) || "No improvement goal entered."}</p>
      </div>

      <div className="detailActions">
        <button type="button" onClick={() => updateRequestStatus(request.id, "contacted")}>
          <CheckCircle2 size={15} /> Contacted
        </button>
        <button type="button" onClick={() => updateRequestStatus(request.id, "waiting_reply")}>
          <Clock size={15} /> Waiting
        </button>
        <button type="button" onClick={() => updateRequestStatus(request.id, "evaluation_interested")}>
          <Trophy size={15} /> Interested
        </button>
        <button type="button" onClick={() => updateRequestStatus(request.id, "evaluation_booked")}>
          <CalendarCheck size={15} /> Booked
        </button>
        <button type="button" className="archiveBtn" onClick={() => updateRequestStatus(request.id, "archived")}>
          <Archive size={15} /> Archive
        </button>
      </div>
    </aside>
  );
}

function DetailItem({ label, value, href }) {
  return (
    <div className="detailItem">
      <small>{label}</small>
      {href ? (
        <a className="detailLink" href={href}>
          {value}
        </a>
      ) : (
        <strong>{value}</strong>
      )}
    </div>
  );
}

function RequestStatusBadge({ status }) {
  return <em className={`requestBadge ${status}`}>{REQUEST_STATUS_LABELS[status] || "New Request"}</em>;
}

function CoachManagement({ coaches, coachForm, setCoachForm, addCoachProfile, setCoachActive, saving, refresh }) {
  const activeCount = coaches.filter(coach => coach.active).length;
  const adminCount = coaches.filter(coach => coach.active && coach.role === "admin").length;
  const pendingCount = coaches.filter(coach => !coach.user_id).length;

  return (
    <main className="page coachesPage">
      <section className="hero">
        <div>
          <span>Admin Controls</span>
          <h1>Coach Access</h1>
          <p>Add approved THRiVE coaches, assign roles, and deactivate access without deleting history.</p>
        </div>
        <button className="goldBtn" type="button" onClick={refresh}>
          <RefreshCw size={17} /> Refresh
        </button>
      </section>

      <section className="statGrid coachStats">
        <Metric title="Active Coaches" value={activeCount} sub="Can access dashboard" />
        <Metric title="Admins" value={adminCount} sub="Can manage coaches" />
        <Metric title="Pending" value={pendingCount} sub="Needs Auth user" />
        <Metric title="Total Profiles" value={coaches.length} sub="All coach records" />
      </section>

      <section className="coachGrid">
        <form className="formPanel coachAddPanel" onSubmit={addCoachProfile}>
          <SectionTitle>Add Coach Access</SectionTitle>
          <p className="coachHelpText">
            First create the coach in Supabase Authentication. Then add the same email here to approve dashboard access.
          </p>

          <div className="field full">
            <label>Coach Email</label>
            <input
              type="email"
              value={coachForm.email}
              onChange={event => setCoachForm({ ...coachForm, email: event.target.value })}
              placeholder="coach@thrivebasketball.org"
              autoComplete="email"
              required
            />
          </div>

          <div className="field full">
            <label>Role</label>
            <select value={coachForm.role} onChange={event => setCoachForm({ ...coachForm, role: event.target.value })}>
              <option value="coach">Coach</option>
              <option value="admin">Admin</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>

          <button className="submitBtn" disabled={saving}>
            <UserPlus size={18} /> {saving ? "Saving..." : "Add / Update Coach"}
          </button>
        </form>

        <section className="panel coachListPanel">
          <div className="panelHeader">
            <div>
              <h2>Approved Coaches</h2>
              <p className="panelSubtext">Only active approved coaches can access protected THRiVE dashboard data.</p>
            </div>
          </div>

          <div className="coachList">
            {coaches.map(coach => (
              <article className={`coachRow ${coach.active ? "active" : "inactive"}`} key={coach.id || coach.email}>
                <div>
                  <strong>{coach.email}</strong>
                  <span>{coach.user_id ? "Auth linked" : "Pending Auth user"}</span>
                </div>

                <em className={`coachRole ${coach.role || "coach"}`}>{coach.role || "coach"}</em>
                <em className={`coachStatus ${coach.active ? "active" : "inactive"}`}>{coach.active ? "Active" : "Inactive"}</em>

                <button
                  type="button"
                  className={coach.active ? "ghostBtn danger" : "goldBtn mini"}
                  onClick={() => setCoachActive(coach, !coach.active)}
                  disabled={saving}
                >
                  {coach.active ? "Deactivate" : "Reactivate"}
                </button>
              </article>
            ))}

            {!coaches.length && <div className="empty">No coach profiles found.</div>}
          </div>
        </section>
      </section>
    </main>
  );
}

function EvaluationHistory({ stats, evaluations, search, setSearch, refresh }) {
  return (
    <main className="page">
      <section className="hero">
        <div>
          <span>Coach Dashboard</span>
          <h1>Evaluation History</h1>
          <p>Track player evaluations, placement levels, and development priorities.</p>
        </div>
        <button className="goldBtn" onClick={refresh}>
          <RefreshCw size={17} /> Refresh
        </button>
      </section>

      <section className="statGrid">
        <Metric title="Total Evaluations" value={stats.total} sub="All time" />
        <Metric title="Players Evaluated" value={stats.uniquePlayers} sub="Unique athletes" />
        <Metric title="Average Score" value={stats.avg} sub="Weighted /10" />
        <Metric title="Top Placement" value={stats.topPlacement} sub="Most common level" />
      </section>

      <section className="panel">
        <div className="panelHeader">
          <h2>Evaluation History</h2>
          <div className="searchBox">
            <Search size={16} />
            <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search player, coach, placement..." />
          </div>
        </div>

        <div className="table">
          <div className="tableHead">
            <span>Player</span>
            <span>Position</span>
            <span>Weighted</span>
            <span>OVR</span>
            <span>Placement</span>
            <span>Coach</span>
          </div>

          {evaluations.map(evaluation => (
            <div className="tableRow" key={evaluation.id}>
              <span>
                <strong>{playerName(evaluation.players || {})}</strong>
                <small>{evaluation.evaluation_date}</small>
              </span>
              <span>{evaluation.position || "-"}</span>
              <span className="goldText">{evaluation.weighted_score}</span>
              <span className="ovr">{evaluation.ovr}</span>
              <span><PlacementBadge placement={evaluation.placement} /></span>
              <span>{evaluation.coach_name}</span>
            </div>
          ))}

          {!evaluations.length && <div className="empty">No evaluations yet.</div>}
        </div>
      </section>
    </main>
  );
}

function EvaluationForm({
  players,
  selectedPlayerId,
  setSelectedPlayerId,
  selectedPlayer,
  evalForm,
  setEvalForm,
  scores,
  setScores,
  scoreSummary,
  submitEvaluation,
  saving
}) {
  return (
    <main className="page narrow">
      <section className="hero compact">
        <div>
          <span>New Evaluation</span>
          <h1>Coach Assessment</h1>
          <p>Select a registered athlete, score each category, and save the evaluation.</p>
        </div>
      </section>

      <form onSubmit={submitEvaluation} className="formPanel">
        <SectionTitle>Player Information</SectionTitle>

        <div className="field full">
          <label>Select Registered Athlete</label>
          <select value={selectedPlayerId} onChange={event => setSelectedPlayerId(event.target.value)}>
            <option value="">— Select Athlete —</option>
            {players.map(player => (
              <option key={player.id} value={player.id}>
                {playerName(player)}{player.grade ? ` · ${player.grade}` : ""}
              </option>
            ))}
          </select>
        </div>

        {selectedPlayer && (
          <div className="playerPreview">
            <strong>{playerName(selectedPlayer)}</strong>
            <span>{selectedPlayer.position || "Position not set"} · {selectedPlayer.grade || "Grade not set"} · {selectedPlayer.school || "School not set"}</span>
          </div>
        )}

        <div className="formGrid">
          <FieldSelect label="Evaluation Type" value={evalForm.evaluation_type} onChange={value => setEvalForm({ ...evalForm, evaluation_type: value })} options={["Initial Evaluation", "Re-Evaluation"]} />
          <FieldSelect label="Coach Name" value={evalForm.coach_name} onChange={value => setEvalForm({ ...evalForm, coach_name: value })} options={COACHES} placeholder="Select Coach" />
          <div className="field">
            <label>Evaluation Date</label>
            <input type="date" value={evalForm.evaluation_date} onChange={event => setEvalForm({ ...evalForm, evaluation_date: event.target.value })} />
          </div>
          <FieldSelect label="Position" value={evalForm.position} onChange={value => setEvalForm({ ...evalForm, position: value })} options={["Guard", "Forward", "Post"]} placeholder="Select Position" />
        </div>

        <SectionTitle>Category Ratings — 1 to 10</SectionTitle>

        <div className="ratings">
          {CATEGORIES.map(category => (
            <div className="ratingCard" key={category.key}>
              <div className="ratingTop">
                <div className="ratingInfo">
                  <span className="ratingIcon">{category.icon}</span>
                  <div>
                    <strong>{category.label}</strong>
                    <p>{category.desc}</p>
                  </div>
                </div>
                <div className="ratingValue">{scores[category.key]}<small>/10</small></div>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                step="1"
                value={scores[category.key]}
                onChange={event => setScores({ ...scores, [category.key]: Number(event.target.value) })}
              />
            </div>
          ))}
        </div>

        <SectionTitle>Coaching Notes</SectionTitle>

        <FieldTextarea label="Strengths" value={evalForm.strengths} onChange={value => setEvalForm({ ...evalForm, strengths: value })} placeholder="What does this player do well?" />
        <FieldTextarea label="Challenges" value={evalForm.challenges} onChange={value => setEvalForm({ ...evalForm, challenges: value })} placeholder="What needs development?" />
        <FieldTextarea label="Next Steps" value={evalForm.next_steps} onChange={value => setEvalForm({ ...evalForm, next_steps: value })} placeholder="Specific development priorities." />

        <section className="scoreSummary">
          <Metric title="Weighted Score" value={scoreSummary.weighted} sub="/10 adjusted" />
          <Metric title="Raw Average" value={scoreSummary.raw} sub="/10 average" />
          <Metric title="OVR" value={scoreSummary.ovr} sub="/99 rating" />
          <div className="placementBox">
            <Trophy />
            <PlacementBadge placement={scoreSummary.placement} />
          </div>
        </section>

        <button className="submitBtn" disabled={saving}>{saving ? "Saving..." : "Submit Evaluation"}</button>
      </form>
    </main>
  );
}

function PlayerForm({ playerForm, setPlayerForm, createPlayer, saving }) {
  return (
    <main className="page narrow">
      <section className="hero compact">
        <div>
          <span>Add Player</span>
          <h1>Register Athlete</h1>
          <p>Add a player directly into the clean evaluation database.</p>
        </div>
      </section>

      <form className="formPanel" onSubmit={createPlayer}>
        <SectionTitle>Player Profile</SectionTitle>

        <div className="formGrid">
          <div className="field">
            <label>First Name</label>
            <input required value={playerForm.first_name} onChange={event => setPlayerForm({ ...playerForm, first_name: event.target.value })} />
          </div>

          <div className="field">
            <label>Last Name</label>
            <input required value={playerForm.last_name} onChange={event => setPlayerForm({ ...playerForm, last_name: event.target.value })} />
          </div>

          <div className="field">
            <label>Birth Year</label>
            <input value={playerForm.birth_year} onChange={event => setPlayerForm({ ...playerForm, birth_year: event.target.value })} placeholder="2010" />
          </div>

          <FieldSelect
            label="Grade Level / Age"
            value={playerForm.grade}
            onChange={value => setPlayerForm({ ...playerForm, grade: value })}
            options={[
              "Grade 5 (Age 9-11)",
              "Grade 6 (Age 10-12)",
              "Grade 7 (Age 11-13)",
              "Grade 8 (Age 12-14)",
              "Grade 9 (Age 13-15)",
              "Grade 10 (Age 14-16)",
              "Grade 11 (Age 15-17)",
              "Grade 12 (Age 16-18)",
              "Prep / College / University (Age 18-22+)"
            ]}
            placeholder="Select Grade / Age"
          />

          <FieldSelect
            label="Position"
            value={playerForm.position}
            onChange={value => setPlayerForm({ ...playerForm, position: value })}
            options={["Guard", "Forward", "Post"]}
            placeholder="Select Position"
          />

          <div className="field">
            <label>School</label>
            <input value={playerForm.school} onChange={event => setPlayerForm({ ...playerForm, school: event.target.value })} />
          </div>
        </div>

        <button className="submitBtn" disabled={saving}>
          <Plus size={18} /> {saving ? "Saving..." : "Create Player"}
        </button>
      </form>
    </main>
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

function FieldSelect({ label, value, onChange, options, placeholder }) {
  return (
    <div className="field">
      <label>{label}</label>
      <select value={value} onChange={event => onChange(event.target.value)}>
        <option value="">{placeholder || "Select"}</option>
        {options.map(option => <option key={option} value={option}>{option}</option>)}
      </select>
    </div>
  );
}

function FieldTextarea({ label, value, onChange, placeholder }) {
  return (
    <div className="field full">
      <label>{label}</label>
      <textarea value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} />
    </div>
  );
}

function Metric({ title, value, sub, onClick, active = false }) {
  const className = `metric ${onClick ? "metricClickable" : ""} ${active ? "metricSelected" : ""}`.trim();

  if (onClick) {
    return (
      <button type="button" className={className} onClick={onClick} aria-pressed={active}>
        <span>{title}</span>
        <strong>{value}</strong>
        <small>{sub}</small>
      </button>
    );
  }

  return (
    <div className={className}>
      <span>{title}</span>
      <strong>{value}</strong>
      <small>{sub}</small>
    </div>
  );
}

function PlacementBadge({ placement }) {
  const key = String(placement || "").toLowerCase().replace(/\s/g, "");
  return <em className={`badge ${key}`}>{placement || "-"}</em>;
}

function SectionTitle({ children }) {
  return <h2 className="sectionTitle">{children}</h2>;
}