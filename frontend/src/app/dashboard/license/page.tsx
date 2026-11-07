"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  Copy,
  Check,
  Camera,
  ArrowLeft,
  Sparkles,
  Settings,
  Phone,
  Calendar,
  User,
  ExternalLink,
  Award,
  Trophy,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./license.module.css";
import { useSessionProfile, useUpdateProfile } from "../../../lib/hooks/useSessionProfile";
import { processProfileImage } from "../../../lib/imageUtils";

export default function DriverLicensePage() {
  const router = useRouter();
  const { data: profile } = useSessionProfile();
  const updateProfile = useUpdateProfile();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [copied, setCopied] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Guard: Driver License is strictly student-only
  useEffect(() => {
    if (profile?.role && profile.role !== "student") {
      const home = profile.role === "school_staff" 
        ? "/dashboard/school/overview" 
        : profile.role === "staff" 
          ? "/dashboard/hanbee/my-space" 
          : "/dashboard/manager/monitor";
      router.replace(home);
    }
  }, [profile, router]);

  if (profile?.role && profile.role !== "student") {
    return null;
  }

  // 3D Holographic Card Interactive Physics
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0 });
  const [glarePos, setGlarePos] = useState({ x: 50, y: 50, opacity: 0 });

  const handleCardMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setTilt({
      rotateX: (0.5 - y) * 12,
      rotateY: (x - 0.5) * 12,
    });
    setGlarePos({
      x: x * 100,
      y: y * 100,
      opacity: 0.18,
    });
  };

  const handleCardMouseLeave = () => {
    setTilt({ rotateX: 0, rotateY: 0 });
    setGlarePos((prev) => ({ ...prev, opacity: 0 }));
  };

  const driverName = profile?.full_name || "Student Driver";
  const avatarUrl = profile?.avatar_url || null;
  const phone = profile?.phone || "";
  const age = profile?.age || "";
  const serialNumber = profile?.id ? `HB-${profile.id.slice(0, 8).toUpperCase()}` : "HB-PENDING";

  const handleCopySerial = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(serialNumber);
    }
    setCopied(true);
    setToastMessage(`✓ Copied Driver License ID: ${serialNumber}`);
    setTimeout(() => {
      setCopied(false);
      setToastMessage(null);
    }, 3000);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile?.id) return;
    try {
      setUploadingPhoto(true);
      const dataUrl = await processProfileImage(file);
      await updateProfile.mutateAsync({
        id: profile.id,
        avatar_url: dataUrl,
      });
      setToastMessage("✓ Profile photo updated successfully!");
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      setToastMessage(msg);
      setTimeout(() => setToastMessage(null), 3500);
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className={styles.licensePage}>
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={styles.toastNotification}
          >
            <Sparkles size={18} color="#7dd3e8" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className={styles.pageHeader}>
        <div className={styles.headerLeft}>
          <h1 className={styles.pageTitle}>
            Student Driver License
          </h1>
          <p className={styles.pageSubtitle}>
            Official student driver identification card and verified credentials.
          </p>
        </div>

        <div className={styles.headerActions}>
          <Link href="/dashboard/settings" className={styles.actionBtnSecondary}>
            <Settings size={14} />
            <span>Settings</span>
          </Link>
          <Link href="/dashboard" className={styles.actionBtnPrimary}>
            <ArrowLeft size={14} />
            <span>Dashboard</span>
          </Link>
        </div>
      </header>

      {/* Centered Clean License Card Container */}
      <div className={styles.cardContainerWrapper}>
        <div className={styles.licensePerspectiveWrapper}>
          <motion.div 
            className={styles.licenseCard}
            animate={{ 
              rotateX: tilt.rotateX, 
              rotateY: tilt.rotateY,
            }}
            transition={{ 
              type: "spring", 
              stiffness: 260, 
              damping: 24, 
              mass: 0.5 
            }}
            onMouseMove={handleCardMouseMove}
            onMouseLeave={handleCardMouseLeave}
          >
            {/* Dynamic Glare Effect */}
            <div 
              className={styles.cardSpecularGlare}
              style={{
                background: `radial-gradient(circle at ${glarePos.x}% ${glarePos.y}%, rgba(255, 255, 255, 0.22) 0%, rgba(125, 211, 232, 0.08) 30%, transparent 65%)`,
                opacity: glarePos.opacity,
              }}
            />

            {/* Top Bar / Header */}
            <div className={styles.cardHeader}>
              <div className={styles.cardFederationTitle}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/brand/hanbee-logo-white.png"
                  alt="HANBEE"
                  className={styles.cardLogoImg}
                />
                <span className={styles.cardHeaderSeries}>// RC SERIES</span>
              </div>
              <div className={styles.licenseSuperBadge}>
                RACER PASS
              </div>
            </div>

            {/* Card Main Body: Photo (Left) + Smart Chip & Details (Right) */}
            <div className={styles.licenseMainBody}>
              {/* Profile Photo Box */}
              <div className={styles.photoContainer}>
                {avatarUrl ? (
                  <div className={styles.photoWrap}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={avatarUrl} alt={driverName} className={styles.driverPhoto} />
                    <button
                      type="button"
                      className={styles.changePhotoBtn}
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingPhoto}
                      title="Update photo"
                    >
                      <Camera size={13} />
                      <span>{uploadingPhoto ? "Saving..." : "Change"}</span>
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className={styles.uploadPhotoBox}
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingPhoto}
                    title="Upload Profile Picture"
                  >
                    <div className={styles.uploadPlaceholderIcon}>
                      <Camera size={26} color="#7dd3e8" />
                    </div>
                    <span className={styles.uploadPhotoText}>
                      {uploadingPhoto ? "Uploading..." : "Upload Photo"}
                    </span>
                    <span className={styles.uploadPhotoSub}>JPG / PNG</span>
                  </button>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handlePhotoUpload}
                  className={styles.hiddenFileInput}
                />
              </div>

              {/* Right Column: Microchip + Info Fields */}
              <div className={styles.licenseDetailsCol}>
                {/* Gold Smart Chip Row */}
                <div className={styles.chipRow}>
                  <div className={styles.smartChip} title="2.4GHz Telemetry RFID Microchip">
                    <div className={styles.smartChipInner}>
                      <div className={styles.smartChipLineH} />
                      <div className={styles.smartChipLineV} />
                    </div>
                  </div>
                </div>

                {/* Personal Information Fields */}
                <div className={styles.infoFieldsList}>
                  {/* Name */}
                  <div className={styles.infoField}>
                    <span className={styles.fieldLabel}>DRIVER NAME</span>
                    <span className={styles.fieldNameVal}>{driverName}</span>
                  </div>

                  {/* Age & Phone in compact grid */}
                  <div className={styles.infoFieldRow}>
                    <div className={styles.infoField}>
                      <span className={styles.fieldLabel}>AGE</span>
                      <span className={styles.fieldVal}>
                        {age ? `${age} YRS` : <span className={styles.emptyVal}>Not set</span>}
                      </span>
                    </div>

                    <div className={styles.infoField}>
                      <span className={styles.fieldLabel}>PHONE NUMBER</span>
                      <span className={styles.fieldVal}>
                        {phone ? phone : <span className={styles.emptyVal}>Not set</span>}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Bar: Barcode, Serial Number & Quick Link */}
            <div className={styles.cardFooter}>
              <div className={styles.barcodeArea}>
                <div className={styles.barcodeBar} style={{ width: 2 }} />
                <div className={styles.barcodeBar} style={{ width: 4 }} />
                <div className={styles.barcodeBar} style={{ width: 1 }} />
                <div className={styles.barcodeBar} style={{ width: 3 }} />
                <div className={styles.barcodeBar} style={{ width: 5 }} />
                <div className={styles.barcodeBar} style={{ width: 2 }} />
                <div className={styles.barcodeBar} style={{ width: 1 }} />
                <div className={styles.barcodeBar} style={{ width: 4 }} />
              </div>

              <Link href="/dashboard/settings" className={styles.settingsLinkBadge} title="Edit your age, phone, or name">
                <Settings size={12} />
                <span>Edit in Settings</span>
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
