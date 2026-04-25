"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebaseAuth } from '@/components/FirebaseAuthProvider';
import { getDocument, getPipelineByJob, normalizePipelineStage } from '@/lib/firebase-firestore';
import { Loader2, MapPin, Building, DollarSign, Calendar, Tag, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import {
  getCandidatesSearchUrl,
  getEmployerJobsListUrl,
  getJobCompareUrl,
  getJobMatchesUrl,
  getJobPipelineUrl,
} from '@/lib/navigation';
import {
  fetchJobEvaluationCriteria,
  fetchJobEvaluations,
  fetchJobReviews,
  saveJobEvaluationCriteria,
} from '@/lib/decision-client';
import { fetchJobInterviews } from "@/lib/communication-client";
import {
  summarizeCandidateEvaluations,
  type CandidateEvaluation,
  type CandidateReviewRequest,
  type JobEvaluationCriterion,
} from '@/lib/hiring-decision';
import { pipelineStageLabel } from "@/lib/recruiter-ui";

export default function ViewJobPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { user, profile, loading } = useFirebaseAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [job, setJob] = useState<any>(null);
  const [shortlistCount, setShortlistCount] = useState(0);
  const [activePipelineCount, setActivePipelineCount] = useState(0);
  const [criteria, setCriteria] = useState<JobEvaluationCriterion[]>([]);
  const [criteriaSaving, setCriteriaSaving] = useState(false);
  const [criteriaOpen, setCriteriaOpen] = useState(false);
  const [newCriterionLabel, setNewCriterionLabel] = useState('');
  const [newCriterionDescription, setNewCriterionDescription] = useState('');
  const [newCriterionWeight, setNewCriterionWeight] = useState('');
  const [decisionSignals, setDecisionSignals] = useState({
    awaitingReview: 0,
    incompleteEvaluations: 0,
    finalists: 0,
    readyForDebrief: 0,
  });
  const [interviewSummary, setInterviewSummary] = useState({
    scheduled: 0,
    today: 0,
    awaitingConfirmation: 0,
  });

  useEffect(() => {
    if (loading) return;
    if (!user || !profile || (profile.role !== 'EMPLOYER' && profile.role !== 'RECRUITER')) {
      router.replace('/auth/login');
    }
  }, [loading, user, profile, router]);

  useEffect(() => {
    if (loading) return;
    if (!user || !profile || (profile.role !== 'EMPLOYER' && profile.role !== 'RECRUITER')) {
      setIsLoading(false);
      return;
    }

    const fetchJob = async () => {
      if (!params.id) return;
      
      setIsLoading(true);
      try {
        const { data: jobData, error } = await getDocument('jobs', params.id);
        if (error) {
          setError('Failed to load job');
          return;
        }
        
        if (!jobData) {
          setError('Job not found');
          return;
        }

        const j = jobData as any;
        const sameEmployer = j.employerId === user.uid;
        const sameCompany =
          j.companyId &&
          profile?.companyId &&
          j.companyId === profile.companyId &&
          (profile.role === 'EMPLOYER' || profile.role === 'RECRUITER');
        if (!sameEmployer && !sameCompany) {
          setError('You can only view your own jobs');
          return;
        }

        setJob({ ...j, id: params.id });
      } catch (err) {
        console.error('Error fetching job:', err);
        setError('Failed to load job');
      } finally {
        setIsLoading(false);
      }
    };

    fetchJob();
  }, [params.id, user, profile, loading]);

  useEffect(() => {
    if (loading || !user || !params.id) return;
    if (profile?.role !== 'EMPLOYER' && profile?.role !== 'RECRUITER') return;
    (async () => {
      const { data } = await getPipelineByJob(params.id);
      const rows = data || [];
      setShortlistCount(rows.filter((e: any) => normalizePipelineStage(e.stage) === 'SHORTLIST').length);
      setActivePipelineCount(rows.filter((e: any) => normalizePipelineStage(e.stage) !== 'REJECTED').length);

      const token = await user.getIdToken();
      const [criteriaRes, evaluationsRes, reviewsRes, interviewsRes] = await Promise.all([
        fetchJobEvaluationCriteria(params.id, token),
        fetchJobEvaluations(params.id, token),
        fetchJobReviews(params.id, token),
        fetchJobInterviews(params.id, token),
      ]);

      const criteriaRows = criteriaRes.ok ? (criteriaRes.data.criteria || []) : [];
      setCriteria(criteriaRows as JobEvaluationCriterion[]);

      const activeCriteria = criteriaRows
        .filter((c: JobEvaluationCriterion) => c.active !== false)
        .sort((a: JobEvaluationCriterion, b: JobEvaluationCriterion) => Number(a.order || 0) - Number(b.order || 0));
      const evaluations = evaluationsRes.ok ? ((evaluationsRes.data.evaluations || []) as CandidateEvaluation[]) : [];
      const reviews = reviewsRes.ok ? ((reviewsRes.data.reviews || []) as CandidateReviewRequest[]) : [];

      const evalByCandidate = new Map<string, CandidateEvaluation[]>();
      for (const ev of evaluations) {
        const cid = String(ev.candidateId || '');
        if (!cid) continue;
        const list = evalByCandidate.get(cid) || [];
        list.push(ev);
        evalByCandidate.set(cid, list);
      }
      const reviewByCandidate = new Map<string, CandidateReviewRequest>();
      for (const review of reviews) {
        const cid = String(review.candidateId || '');
        if (!cid) continue;
        if (!reviewByCandidate.has(cid)) reviewByCandidate.set(cid, review);
      }

      let awaitingReview = 0;
      let incompleteEvaluations = 0;
      let finalists = 0;
      let readyForDebrief = 0;
      for (const row of rows as any[]) {
        const stage = normalizePipelineStage(row.stage);
        const candidateId = String(row.candidateId || '');
        const evaluationSummary = summarizeCandidateEvaluations(evalByCandidate.get(candidateId) || [], activeCriteria);
        const review = reviewByCandidate.get(candidateId);
        if (review?.status === 'REQUESTED') awaitingReview += 1;
        if ((stage === 'SHORTLIST' || stage === 'INTERVIEW' || stage === 'FINALIST') && !evaluationSummary.isComplete) {
          incompleteEvaluations += 1;
        }
        if (stage === 'FINALIST') finalists += 1;
        if (
          stage === 'SHORTLIST' &&
          evaluationSummary.count > 0 &&
          review?.status !== 'REQUESTED'
        ) {
          readyForDebrief += 1;
        }
      }
      setDecisionSignals({
        awaitingReview,
        incompleteEvaluations,
        finalists,
        readyForDebrief,
      });
      const interviews = interviewsRes.ok ? (interviewsRes.data.interviews || []) : [];
      const today = new Date().toDateString();
      setInterviewSummary({
        scheduled: interviews.filter((iv: any) =>
          ["PROPOSED", "SCHEDULED", "CONFIRMED", "RESCHEDULE_REQUESTED"].includes(String(iv?.status || ""))
        ).length,
        today: interviews.filter((iv: any) => {
          const raw = iv?.scheduledAt;
          const d = raw?.toDate ? raw.toDate() : raw ? new Date(raw) : null;
          return d && d.toDateString() === today && String(iv?.status || "") !== "CANCELLED";
        }).length,
        awaitingConfirmation: interviews.filter(
          (iv: any) => String(iv?.candidateResponse || "PENDING") === "PENDING" && String(iv?.status || "") !== "CANCELLED"
        ).length,
      });
    })();
  }, [loading, user, profile, params.id]);

  const handleAddCriterion = () => {
    const label = newCriterionLabel.trim();
    if (!label) return;
    const next: JobEvaluationCriterion = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      label,
      description: newCriterionDescription.trim(),
      weight: newCriterionWeight.trim() ? Number(newCriterionWeight) : null,
      priority: null,
      order: criteria.length,
      active: true,
    };
    setCriteria((prev) => [...prev, next]);
    setNewCriterionLabel('');
    setNewCriterionDescription('');
    setNewCriterionWeight('');
  };

  const handleUpdateCriterion = (id: string, updates: Partial<JobEvaluationCriterion>) => {
    setCriteria((prev) =>
      prev.map((criterion) => (criterion.id === id ? { ...criterion, ...updates } : criterion))
    );
  };

  const handleRemoveCriterion = (id: string) => {
    setCriteria((prev) =>
      prev
        .filter((criterion) => criterion.id !== id)
        .map((criterion, index) => ({ ...criterion, order: index }))
    );
  };

  const handleSaveCriteria = async () => {
    if (!user) return;
    setCriteriaSaving(true);
    try {
      const token = await user.getIdToken();
      const payload = criteria.map((criterion, index) => ({
        ...criterion,
        order: index,
      }));
      const res = await saveJobEvaluationCriteria(params.id, payload, token);
      if (!res.ok) {
        console.error(res.error || 'Failed to save evaluation criteria');
        return;
      }
      setCriteria((res.data.criteria || []) as JobEvaluationCriterion[]);
    } finally {
      setCriteriaSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-navy-800" />
          <p className="text-slate-600">Loading job details...</p>
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Job not found'}</p>
          <Link
            href="/home/employer"
            className="inline-flex items-center gap-2 text-navy-800 hover:text-navy-600 transition-all duration-200 group px-3 py-2 rounded-lg hover:bg-sky-50 hover:shadow-md"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform duration-200" />
            <span>Back to Dashboard</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 mobile-safe-top mobile-safe-bottom">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 p-6">
        <div className="mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-navy-900 mb-1">{job.title}</h1>
          <p className="text-sm text-slate-600">
            Command center for this requisition — use the workspace tabs for day-to-day hiring work.
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8">
          {/* Job Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${
                job.status === "ACTIVE"
                  ? "border-sky-200 bg-sky-50 text-sky-950"
                  : "border-slate-200 bg-slate-100 text-slate-700"
              }`}>
                {job.status === "ACTIVE" ? "Active" : job.status === "DRAFT" ? "Draft" : pipelineStageLabel(job.status)}
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="flex items-center text-slate-600">
                <MapPin className="h-5 w-5 mr-2" />
                <span>
                  {job.locationCity && job.locationState 
                    ? `${job.locationCity}, ${job.locationState}` 
                    : 'Remote'
                  }
                </span>
              </div>
              <div className="flex items-center text-slate-600">
                <Building className="h-5 w-5 mr-2" />
                <span>{job.employment}</span>
              </div>
              <div className="flex items-center text-slate-600">
                <DollarSign className="h-5 w-5 mr-2" />
                <span>
                  {job.salaryMin && job.salaryMax 
                    ? `$${job.salaryMin.toLocaleString()} - $${job.salaryMax.toLocaleString()}`
                    : 'Salary not specified'
                  }
                </span>
              </div>
            </div>

            <div className="flex items-center text-sm text-slate-500">
              <Calendar className="h-4 w-4 mr-2" />
              <span>Posted {job.createdAt ? new Date(job.createdAt).toLocaleDateString() : 'Recently'}</span>
              {job.updatedAt && (
                <span className="ml-4">
                  • Updated {new Date(job.updatedAt).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>

          {/* Job Description */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-slate-900 mb-3">Job Description</h3>
            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-slate-700 whitespace-pre-wrap">{job.description}</p>
            </div>
          </div>

          {/* Tags */}
          {job.tags && job.tags.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-slate-900 mb-3 flex items-center">
                <Tag className="h-5 w-5 mr-2" />
                Skills & Technologies
              </h3>
              <div className="flex flex-wrap gap-2">
                {job.tags.map((tag: string, index: number) => (
                  <span
                    key={index}
                    className="rounded-full bg-sky-100 px-3 py-1 text-sm text-sky-900"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {(shortlistCount > 0 || activePipelineCount > 0) && (
            <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <span className="font-semibold text-navy-900">Pipeline health: </span>
              <span className="text-sky-900 font-medium">{shortlistCount} on shortlist</span>
              {activePipelineCount > 0 ? (
                <span className="text-slate-700"> · {activePipelineCount} active in pipeline</span>
              ) : null}
              <span className="block text-xs text-slate-500 mt-1">
                Shortlist = serious contenders for this job. Pipeline = everyone you are actively working.
              </span>
            </div>
          )}
          <div className="mb-6 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
            <span className="font-semibold text-navy-900">Interview summary: </span>
            <span>{interviewSummary.scheduled} scheduled</span>
            <span className="text-slate-600"> · {interviewSummary.today} upcoming today</span>
            <span className="text-slate-600"> · {interviewSummary.awaitingConfirmation} awaiting confirmation</span>
          </div>

          <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2">
            <button
              type="button"
              onClick={() => setCriteriaOpen((o) => !o)}
              className="flex w-full items-center justify-between text-left text-sm font-semibold text-navy-900"
            >
              <span>Structured evaluation criteria</span>
              <span className="text-slate-500">{criteriaOpen ? "Hide" : "Show"}</span>
            </button>
            {!criteriaOpen ? (
              <p className="text-xs text-slate-600 mt-1 pr-6">
                Optional rubric for consistent evaluations — expand when you need to edit.
              </p>
            ) : null}
          </div>

          {criteriaOpen && (
          <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
            <h3 className="text-base font-semibold text-navy-900 mb-2 sr-only">Structured evaluation criteria</h3>
            <p className="text-xs text-slate-600 mb-3">
              Define how this requisition is evaluated so recruiter and hiring manager feedback stays consistent.
            </p>
            {criteria.length === 0 ? (
              <p className="text-xs text-slate-500 mb-3">No criteria yet. Add at least 3 core dimensions.</p>
            ) : (
              <div className="space-y-2 mb-3">
                {criteria.map((criterion) => (
                  <div key={criterion.id} className="rounded-lg border border-slate-200 bg-white p-2">
                    <div className="flex flex-wrap gap-2">
                      <input
                        value={criterion.label}
                        onChange={(e) => handleUpdateCriterion(criterion.id, { label: e.target.value })}
                        className="flex-1 min-w-[180px] rounded-md border border-slate-200 px-2 py-1.5 text-xs text-slate-700"
                        placeholder="Criterion label"
                      />
                      <input
                        value={criterion.description || ''}
                        onChange={(e) => handleUpdateCriterion(criterion.id, { description: e.target.value })}
                        className="flex-[2] min-w-[220px] rounded-md border border-slate-200 px-2 py-1.5 text-xs text-slate-700"
                        placeholder="What to assess"
                      />
                      <input
                        value={criterion.weight == null ? '' : String(criterion.weight)}
                        onChange={(e) =>
                          handleUpdateCriterion(criterion.id, {
                            weight: e.target.value.trim() ? Number(e.target.value) : null,
                          })
                        }
                        className="w-24 rounded-md border border-slate-200 px-2 py-1.5 text-xs text-slate-700"
                        placeholder="Weight"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveCriterion(criterion.id)}
                        className="rounded-md border border-rose-200 px-2 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="rounded-lg border border-dashed border-slate-300 bg-white p-2 mb-3">
              <div className="flex flex-wrap gap-2">
                <input
                  value={newCriterionLabel}
                  onChange={(e) => setNewCriterionLabel(e.target.value)}
                  className="flex-1 min-w-[180px] rounded-md border border-slate-200 px-2 py-1.5 text-xs text-slate-700"
                  placeholder="New criterion"
                />
                <input
                  value={newCriterionDescription}
                  onChange={(e) => setNewCriterionDescription(e.target.value)}
                  className="flex-[2] min-w-[220px] rounded-md border border-slate-200 px-2 py-1.5 text-xs text-slate-700"
                  placeholder="Description"
                />
                <input
                  value={newCriterionWeight}
                  onChange={(e) => setNewCriterionWeight(e.target.value)}
                  className="w-24 rounded-md border border-slate-200 px-2 py-1.5 text-xs text-slate-700"
                  placeholder="Weight"
                />
                <button
                  type="button"
                  onClick={handleAddCriterion}
                  className="rounded-md border border-slate-200 px-2 py-1.5 text-xs font-semibold text-navy-800 hover:bg-slate-50"
                >
                  Add
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <button
                type="button"
                onClick={handleSaveCriteria}
                disabled={criteriaSaving}
                className="rounded-md bg-navy-800 px-3 py-2 font-semibold text-white hover:bg-navy-700 disabled:opacity-60"
              >
                {criteriaSaving ? 'Saving criteria...' : 'Save criteria'}
              </button>
              <span className="rounded-md border border-slate-200 bg-white px-2 py-2 text-slate-600">
                Awaiting review: <span className="font-semibold text-navy-900">{decisionSignals.awaitingReview}</span>
              </span>
              <span className="rounded-md border border-slate-200 bg-white px-2 py-2 text-slate-600">
                Incomplete evaluations: <span className="font-semibold text-navy-900">{decisionSignals.incompleteEvaluations}</span>
              </span>
              <span className="rounded-md border border-slate-200 bg-white px-2 py-2 text-slate-600">
                Finalists: <span className="font-semibold text-navy-900">{decisionSignals.finalists}</span>
              </span>
              <span className="rounded-md border border-slate-200 bg-white px-2 py-2 text-slate-600">
                Ready for debrief: <span className="font-semibold text-navy-900">{decisionSignals.readyForDebrief}</span>
              </span>
            </div>
          </div>
          )}

          <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => router.push(getJobMatchesUrl(params.id))}
              className="px-5 py-2.5 bg-navy-800 text-white rounded-lg hover:bg-navy-700 transition-colors text-sm font-semibold"
            >
              Review Candidates
            </button>
            <button
              type="button"
              onClick={() => router.push(getJobPipelineUrl(params.id))}
              className="px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-navy-900 hover:bg-slate-50"
            >
              Pipeline
            </button>
            <button
              type="button"
              onClick={() => router.push(getJobCompareUrl(params.id))}
              className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                shortlistCount >= 2
                  ? "border border-sky-200 bg-sky-50 text-navy-900 hover:bg-sky-100"
                  : "border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              Compare{shortlistCount >= 2 ? "" : " (2+ on shortlist)"}
            </button>
            <button
              type="button"
              onClick={() => router.push(getCandidatesSearchUrl(params.id))}
              className="px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-navy-900 hover:bg-slate-50"
            >
              Find Candidates
            </button>
            <button
              type="button"
              onClick={() => router.push(`/employer/job/${params.id}/edit`)}
              className="px-3 py-2.5 text-sm font-medium text-slate-600 hover:text-navy-900"
            >
              Edit job
            </button>
            <button
              type="button"
              onClick={() => router.push(getEmployerJobsListUrl())}
              className="px-3 py-2.5 text-sm font-medium text-slate-500 hover:text-navy-800"
            >
              All requisitions
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
