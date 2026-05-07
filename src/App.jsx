import React, { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  ClipboardList,
  Plus,
  RefreshCw,
  Search,
  Trophy,
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

const EMPTY_PLAYER_FORM = {
  first_name: "",
  last_name: "",
  birth_year: "",
  grade_level: "",
  position: "",
  school: ""
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

function emptyScores() {
  return CATEGORIES.reduce((acc, cat) => ({ ...acc, [cat.key]: 5 }), {});
}

export default function App() {
  const [view, setView] = useState("dashboard");
  const [players, setPlayers] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [playerForm, setPlayerForm] = useState(EMPTY_PLAYER_FORM);

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
    loadData();
  }, []);

  async function loadData() {
    setStatus("Loading coach data...");

    const [playersResult, evaluationsResult] = await Promise.all([
      supabase.from("players").select("*").order("last_name", { ascending: true }),
      supabase
        .from("evaluations")
        .select("*, players(first_name,last_name,full_name,grade_level,position)")
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

    setPlayers(playersResult.data || []);
    setEvaluations(evaluationsResult.data || []);
    setStatus("");
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

  const filteredEvaluations = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return evaluations;

    return evaluations.filter(evaluation =>
      playerName(evaluation.players || {}).toLowerCase().includes(term) ||
      evaluation.coach_name?.toLowerCase().includes(term) ||
      evaluation.placement?.toLowerCase().includes(term)
    );
  }, [evaluations, search]);

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
    setPlayerForm(EMPTY_PLAYER_FORM);
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

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <img src="/thrive-logo.png" alt="THRiVE Logo" className="logo" />
          <div className="brand-text">
            <strong>THRiVE</strong>
            <span>Coach System</span>
          </div>
        </div>

        <nav>
          <button className={view === "dashboard" ? "active" : ""} onClick={() => setView("dashboard")}>
            <BarChart3 size={17} /> Dashboard
          </button>

          <button className={view === "player" ? "active" : ""} onClick={() => setView("player")}>
            <UserPlus size={17} /> Add Player
          </button>

          <button className={view === "evaluate" ? "active" : ""} onClick={() => setView("evaluate")}>
            <ClipboardList size={17} /> New Evaluation
          </button>
        </nav>
      </header>

      {status && (
        <div className="status">
          {status}
        </div>
      )}

      {view === "dashboard" && (
        <Dashboard
          stats={dashboardStats}
          evaluations={filteredEvaluations}
          search={search}
          setSearch={setSearch}
          refresh={loadData}
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
    </div>
  );
}

function Dashboard({ stats, evaluations, search, setSearch, refresh }) {
  return (
    <main className="page">
      <section className="hero">
        <div>
          <span>Coach Dashboard</span>
          <h1>Evaluation Command Center</h1>
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
                {playerName(player)}{player.grade_level ? ` · ${player.grade_level}` : ""}
              </option>
            ))}
          </select>
        </div>

        {selectedPlayer && (
          <div className="playerPreview">
            <strong>{playerName(selectedPlayer)}</strong>
            <span>{selectedPlayer.position || "Position not set"} · {selectedPlayer.grade_level || "Grade not set"} · {selectedPlayer.school || "School not set"}</span>
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

        <button className="submitBtn" disabled={saving}>
          {saving ? "Saving..." : "Submit Evaluation"}
        </button>
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
          <p>Add a player directly into the coach evaluation database.</p>
        </div>
      </section>

      <form className="formPanel" onSubmit={createPlayer}>
        <SectionTitle>Player Profile</SectionTitle>

        <div className="formGrid">
          <FormInput label="First Name" value={playerForm.first_name} onChange={event => setPlayerForm({ ...playerForm, first_name: event.target.value })} required />
          <FormInput label="Last Name" value={playerForm.last_name} onChange={event => setPlayerForm({ ...playerForm, last_name: event.target.value })} required />
          <FormInput label="Birth Year" value={playerForm.birth_year} onChange={event => setPlayerForm({ ...playerForm, birth_year: event.target.value })} placeholder="2010" />

          <FieldSelect
            label="Grade Level / Age"
            value={playerForm.grade_level}
            onChange={value => setPlayerForm({ ...playerForm, grade_level: value })}
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

          <FormInput label="School" value={playerForm.school} onChange={event => setPlayerForm({ ...playerForm, school: event.target.value })} />
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

function Metric({ title, value, sub }) {
  return (
    <div className="metric">
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
