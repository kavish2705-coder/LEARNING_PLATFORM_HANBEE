"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, ChevronRight, Trophy, Users, Palette, Flag } from "lucide-react";
import wizardStyles from "./wizard.module.css";
import { useRouter } from "next/navigation";
import { fetchUpcomingTournament, startStudentTeam } from "../../../../lib/teamFormationApi";
import { authenticatedSupabaseFetch } from "../../../../lib/supabaseAuth";

export default function StartTeamWizard() {
  const [step, setStep] = useState(1);
  const [teamName, setTeamName] = useState("");
  const [division, setDivision] = useState("Robotics 101");
  const [teamColor, setTeamColor] = useState("#0891b2");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const handleNext = () => setStep(s => Math.min(s + 1, 3));
  const handlePrev = () => setStep(s => Math.max(s - 1, 1));
  const [submitError, setSubmitError] = useState("");

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError("");
    try {
      const tournament = await fetchUpcomingTournament();
      if (!tournament) throw new Error("There is no open tournament to join right now.");
      const teamId = await startStudentTeam(tournament.id, teamName.trim(), division);
      await authenticatedSupabaseFetch(`/rest/v1/tournament_teams?id=eq.${teamId}`, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ color: teamColor }),
      });
      router.push("/dashboard/team");
    } catch (reason) {
      setSubmitError(reason instanceof Error ? reason.message : "We couldn't create your team.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={wizardStyles.wizardContainer}>
      <Link href="/dashboard/team" className={wizardStyles.backLink}>
        <ArrowLeft size={16} /> Back to My Team
      </Link>

      <div className={wizardStyles.wizardCard}>
        <div className={wizardStyles.stepper}>
          <StepIndicator current={step} target={1} icon={<Flag size={18} />} label="Details" />
          <div className={`${wizardStyles.stepLine} ${step > 1 ? wizardStyles.stepLineActive : ''}`} />
          <StepIndicator current={step} target={2} icon={<Palette size={18} />} label="Colors" />
          <div className={`${wizardStyles.stepLine} ${step > 2 ? wizardStyles.stepLineActive : ''}`} />
          <StepIndicator current={step} target={3} icon={<Check size={18} />} label="Finish" />
        </div>

        <div className={wizardStyles.stepContent}>
          {step === 1 && (
            <div className={wizardStyles.stepPanel}>
              <h2>Team Details</h2>
              <p>Give your racing legacy a name.</p>
              
              <div className={wizardStyles.inputGroup}>
                <label>Team Name</label>
                <input 
                  type="text" 
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="e.g. Apex Predators" 
                  className={wizardStyles.inputField} 
                />
              </div>

              <div className={wizardStyles.inputGroup}>
                <label htmlFor="team-division">Class/Division</label>
                <select
                  id="team-division"
                  className={wizardStyles.inputField}
                  value={division}
                  onChange={(event) => setDivision(event.target.value)}
                >
                  <option value="Robotics 101">Robotics 101</option>
                  <option value="Advanced Engineering">Advanced Engineering</option>
                  <option value="Open Class">Open Class</option>
                </select>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className={wizardStyles.stepPanel}>
              <h2>Team Identity</h2>
              <p>Choose your primary racing color.</p>
              
              <div className={wizardStyles.colorGrid}>
                {["#0891b2", "#4f46e5", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#64748B"].map(c => (
                  <button 
                    key={c}
                    className={`${wizardStyles.colorBtn} ${teamColor === c ? wizardStyles.colorBtnActive : ''}`}
                    style={{ backgroundColor: c }}
                    onClick={() => setTeamColor(c)}
                  >
                    {teamColor === c && <Check size={20} color="#fff" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className={wizardStyles.stepPanel}>
              <h2>Ready to Race?</h2>
              <p>Review your team setup before hitting the track.</p>
              
              <div className={wizardStyles.summaryCard}>
                <div className={wizardStyles.summaryColor} style={{ backgroundColor: teamColor }}></div>
                <div className={wizardStyles.summaryInfo}>
                  <h3>{teamName || "Unnamed Team"}</h3>
                  <span>Division: {division}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className={wizardStyles.wizardFooter}>
          {step > 1 ? (
            <button className={wizardStyles.secondaryBtn} onClick={handlePrev}>Previous</button>
          ) : <div></div>}
          
          {step < 3 ? (
            <button 
              className={wizardStyles.primaryBtn} 
              onClick={handleNext}
              disabled={step === 1 && !teamName.trim()}
            >
              Continue <ChevronRight size={18} />
            </button>
          ) : (
            <button 
              className={wizardStyles.primaryBtn} 
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating..." : "Create Team"}
            </button>
          )}
          {submitError && <p role="alert">{submitError}</p>}
        </div>
      </div>
    </div>
  );
}

function StepIndicator({ current, target, icon, label }: { current: number, target: number, icon: React.ReactNode, label: string }) {
  const isPast = current > target;
  const isActive = current === target;
  return (
    <div className={`${wizardStyles.stepIndicator} ${isActive ? wizardStyles.stepIndicatorActive : ''} ${isPast ? wizardStyles.stepIndicatorPast : ''}`}>
      <div className={wizardStyles.stepIcon}>{icon}</div>
      <span className={wizardStyles.stepLabel}>{label}</span>
    </div>
  );
}
