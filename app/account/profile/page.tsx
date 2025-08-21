"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Profile = {
  firstName?: string;
  lastName?: string;
  headline?: string;
  bio?: string;
  avatarUrl?: string;
  skills?: string[];
  website?: string;
  linkedin?: string;
  github?: string;
  portfolio?: string;
  phone?: string;
  locationCity?: string;
  locationState?: string;
  locationCountry?: string;
  desiredTitles?: string[];
  desiredLocations?: string[];
  workModes?: string[];
  workAuth?: string;
  openToRelocate?: boolean;
  openToRemote?: boolean;
  startDate?: string | null;
  minSalary?: number | null;
  salaryCurrency?: string | null;
  yearsExperience?: number | null;
  school?: string;
  degreeType?: string;
  major?: string;
  graduationYear?: number | null;
  gpa?: number | null;
  certifications?: string[];
  languages?: string[];
  seeking?: string;
  visibility?: boolean;
};

export default function ProfilePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [p, setP] = useState<Profile>({});

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/profile/me");
      if (res.ok) {
        const data = await res.json();
        setP({ ...(data.profile ?? {}) });
      }
    })();
  }, []);

  const onChange = (key: keyof Profile) => (e: any) => {
    const v =
      e?.target?.type === "checkbox"
        ? e.target.checked
        : e?.target?.value ?? e;
    setP((old) => ({ ...old, [key]: v }));
  };

  const onCSV = (key: keyof Profile) => (e: any) => {
    const raw = e.target.value as string;
    const arr = raw.split(",").map((s) => s.trim()).filter(Boolean);
    setP((old) => ({ ...old, [key]: arr }));
  };

  const csvValue = (arr?: string[]) => (arr && arr.length ? arr.join(", ") : "");

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/profile/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(p),
      });
      if (res.ok) {
        alert("Saved!");
        router.push("/home/seeker");
      } else {
        const j = await res.json().catch(() => ({}));
        alert(j?.error || "Failed to update profile");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="max-w-5xl mx-auto p-6">
      <Link href="/home/seeker" className="text-sm text-blue-600">&larr; Back</Link>
      <h1 className="text-3xl font-bold mt-3 mb-6">Edit Profile</h1>

      <form onSubmit={handleSave} className="space-y-8">
        {/* Basics */}
        <section className="bg-white rounded shadow p-5">
          <h2 className="text-lg font-semibold mb-4">Basics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="First name" value={p.firstName || ""} onChange={onChange("firstName")} />
            <Input label="Last name" value={p.lastName || ""} onChange={onChange("lastName")} />
            <Input label="Headline" value={p.headline || ""} onChange={onChange("headline")} className="md:col-span-2" />
            <Textarea label="Bio" value={p.bio || ""} onChange={onChange("bio")} className="md:col-span-2" />
          </div>
        </section>

        {/* Links & contact */}
        <section className="bg-white rounded shadow p-5">
          <h2 className="text-lg font-semibold mb-4">Links & Contact</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Website" value={p.website || ""} onChange={onChange("website")} />
            <Input label="Phone" value={p.phone || ""} onChange={onChange("phone")} />
            <Input label="LinkedIn" value={p.linkedin || ""} onChange={onChange("linkedin")} />
            <Input label="GitHub" value={p.github || ""} onChange={onChange("github")} />
            <Input label="Portfolio" value={p.portfolio || ""} onChange={onChange("portfolio")} className="md:col-span-2" />
          </div>
        </section>

        {/* Skills & Languages */}
        <section className="bg-white rounded shadow p-5">
          <h2 className="text-lg font-semibold mb-4">Skills & Languages</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Skills (comma separated)" value={csvValue(p.skills)} onChange={onCSV("skills")} className="md:col-span-2" />
            <Input label="Languages (comma separated)" value={csvValue(p.languages)} onChange={onCSV("languages")} className="md:col-span-2" />
            <Input label="Certifications (comma separated)" value={csvValue(p.certifications)} onChange={onCSV("certifications")} className="md:col-span-2" />
          </div>
        </section>

        {/* Location */}
        <section className="bg-white rounded shadow p-5">
          <h2 className="text-lg font-semibold mb-4">Location</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input label="City" value={p.locationCity || ""} onChange={onChange("locationCity")} />
            <Input label="State" value={p.locationState || ""} onChange={onChange("locationState")} />
            <Input label="Country" value={p.locationCountry || ""} onChange={onChange("locationCountry")} />
          </div>
        </section>

        {/* Preferences */}
        <section className="bg-white rounded shadow p-5">
          <h2 className="text-lg font-semibold mb-4">Preferences</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Desired job titles (CSV)" value={csvValue(p.desiredTitles)} onChange={onCSV("desiredTitles")} />
            <Input label="Desired locations (CSV)" value={csvValue(p.desiredLocations)} onChange={onCSV("desiredLocations")} />
            <Input label="Work modes (CSV: ONSITE,HYBRID,REMOTE)" value={csvValue(p.workModes)} onChange={onCSV("workModes")} />
            <Input label="Work authorization" value={p.workAuth || ""} onChange={onChange("workAuth")} />
            <Toggle label="Open to relocate" checked={!!p.openToRelocate} onChange={onChange("openToRelocate")} />
            <Toggle label="Open to remote" checked={p.openToRemote ?? true} onChange={onChange("openToRemote")} />
            <Input label="Earliest start date (YYYY-MM-DD)" value={p.startDate ? String(p.startDate).slice(0,10) : ""} onChange={onChange("startDate")} />
            <Input label="Minimum salary" type="number" value={p.minSalary ?? ""} onChange={onChange("minSalary")} />
            <Input label="Currency" value={p.salaryCurrency || "USD"} onChange={onChange("salaryCurrency")} />
            <Input label="Years of experience" type="number" value={p.yearsExperience ?? ""} onChange={onChange("yearsExperience")} />
          </div>
        </section>

        {/* Education snapshot */}
        <section className="bg-white rounded shadow p-5">
          <h2 className="text-lg font-semibold mb-4">Education</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="School" value={p.school || ""} onChange={onChange("school")} />
            <Input label="Degree type" value={p.degreeType || ""} onChange={onChange("degreeType")} />
            <Input label="Major" value={p.major || ""} onChange={onChange("major")} />
            <Input label="Graduation year" type="number" value={p.graduationYear ?? ""} onChange={onChange("graduationYear")} />
            <Input label="GPA" type="number" step="0.01" value={p.gpa ?? ""} onChange={onChange("gpa")} />
          </div>
        </section>

        {/* Visibility */}
        <section className="bg-white rounded shadow p-5">
          <h2 className="text-lg font-semibold mb-4">Visibility</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Open text “seeking”" value={p.seeking || ""} onChange={onChange("seeking")} className="md:col-span-2" />
            <Toggle label="Profile visible to employers" checked={p.visibility ?? true} onChange={onChange("visibility")} />
          </div>
        </section>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
          >
            {loading ? "Saving..." : "Save profile"}
          </button>
          <Link href="/home/seeker" className="px-5 py-2 rounded border">Cancel</Link>
        </div>
      </form>
    </main>
  );
}

function Input(props: any) {
  const { label, className = "", ...rest } = props;
  return (
    <label className={`block ${className}`}>
      <span className="block text-sm font-medium mb-1">{label}</span>
      <input {...rest} className="w-full px-3 py-2 border rounded focus:outline-none focus:ring" />
    </label>
  );
}

function Textarea(props: any) {
  const { label, className = "", ...rest } = props;
  return (
    <label className={`block ${className}`}>
      <span className="block text-sm font-medium mb-1">{label}</span>
      <textarea rows={5} {...rest} className="w-full px-3 py-2 border rounded focus:outline-none focus:ring" />
    </label>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: any }) {
  return (
    <label className="flex items-center gap-3">
      <input type="checkbox" checked={checked} onChange={onChange} className="h-4 w-4" />
      <span className="text-sm">{label}</span>
    </label>
  );
}
