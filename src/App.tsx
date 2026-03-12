/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Search, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Types ---

interface Learner {
  id: string;
  registrationNo: string;
  name: string;
  fatherHusbandName: string;
  motherName: string;
  maritalStatus: string;
  age: string;
  gender: 'M' | 'F' | '';
  isDivyang: 'Y' | 'N';
  divyangType: string;
  category: 'GEN' | 'OBC' | 'SC' | 'ST' | '';
  mobile: string;
}

// --- Constants ---

// IMPORTANT: Replace this with your actual Google Apps Script Web App URL after deployment
const GAS_URL = 'https://script.google.com/macros/s/AKfycbwOcf7yT-2NNBuNvDX0tShkkS__NK_5hs5-WLzODQyRrmljEUdnVVumLmm2X8ESe2KH/exec';

const DIVYANG_TYPES = [
  'Blindness',
  'Low-vision',
  'Leprosy Cured persons',
  'Hearing Impairment',
  'Locomotor Disability',
  'Dwarfism',
  'Intellectual Disability',
  'Mental Illness',
  'Autism Spectrum Disorder',
  'Cerebral Palsy',
  'Muscular Dystrophy',
  'Chronic Neurological conditions',
  'Specific Learning Disabilities',
  'Multiple Sclerosis',
  'Speech and Language disability',
  'Thalassemia',
  'Hemophilia',
  'Sickle Cell disease',
  'Multiple Disabilities',
  'Acid Attack victim',
  'Parkinson\'s disease'
];

const MARITAL_STATUSES = ['Single', 'Married', 'Widowed', 'Divorced'];

export default function App() {
  // --- State ---
  const [udiseCode, setUdiseCode] = useState('');
  const [assessmentCentre, setAssessmentCentre] = useState('');
  const [nyayPanchayat, setNyayPanchayat] = useState('');
  const [isLoadingUdise, setIsLoadingUdise] = useState(false);
  
  const [surveyorName, setSurveyorName] = useState('');
  const [surveyorMobile, setSurveyorMobile] = useState('');
  
  const [learners, setLearners] = useState<Learner[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  // --- Effects ---

  // Fetch UDISE info when code reaches 11 digits
  useEffect(() => {
    if (udiseCode.length === 11) {
      fetchUdiseInfo(udiseCode);
    } else {
      setAssessmentCentre('');
      setNyayPanchayat('');
    }
  }, [udiseCode]);

  // Update registration numbers when UDISE code or learners list changes
  useEffect(() => {
    if (udiseCode.length === 11) {
      setLearners(prev => prev.map((l, index) => ({
        ...l,
        registrationNo: `${udiseCode}${String(index + 1).padStart(3, '0')}`
      })));
    }
  }, [udiseCode, learners.length]);

  // --- Handlers ---

  const fetchUdiseInfo = async (code: string) => {
    setIsLoadingUdise(true);
    setSubmitStatus(null);
    try {
      const response = await fetch(`${GAS_URL}?action=fetchUdise&udiseCode=${code}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });
      
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error('Invalid response from server');
      }

      if (data.success) {
        setAssessmentCentre(data.assessmentCentre);
        setNyayPanchayat(data.nyayPanchayat);
      } else {
        setSubmitStatus({ type: 'error', message: data.message || 'UDISE Code not found in Sheet1' });
      }
    } catch (error) {
      console.error('Error fetching UDISE:', error);
      setSubmitStatus({ 
        type: 'error', 
        message: 'Connection Failed: Ensure your Google Apps Script is deployed as "Web App", executed as "Me", and access is set to "Anyone".' 
      });
    } finally {
      setIsLoadingUdise(false);
    }
  };

  const addLearner = () => {
    const newId = Math.random().toString(36).substr(2, 9);
    const index = learners.length + 1;
    const regNo = udiseCode.length === 11 ? `${udiseCode}${String(index).padStart(3, '0')}` : '';
    
    setLearners([...learners, {
      id: newId,
      registrationNo: regNo,
      name: '',
      fatherHusbandName: '',
      motherName: '',
      maritalStatus: '',
      age: '',
      gender: '',
      isDivyang: 'N',
      divyangType: '',
      category: '',
      mobile: ''
    }]);
  };

  const removeLearner = (id: string) => {
    setLearners(learners.filter(l => l.id !== id));
  };

  const updateLearner = (id: string, field: keyof Learner, value: string) => {
    setLearners(learners.map(l => {
      if (l.id === id) {
        let processedValue = value;
        
        // Name validation: Upper case, English only
        if (field === 'name' || field === 'fatherHusbandName' || field === 'motherName') {
          processedValue = value.toUpperCase().replace(/[^A-Z\s]/g, '');
        }
        
        // Mobile validation: 10 digits only
        if (field === 'mobile') {
          processedValue = value.replace(/\D/g, '').slice(0, 10);
        }

        // Age validation: Numbers only
        if (field === 'age') {
          processedValue = value.replace(/\D/g, '');
        }

        return { ...l, [field]: processedValue };
      }
      return l;
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!udiseCode || !assessmentCentre || !nyayPanchayat) {
      setSubmitStatus({ type: 'error', message: 'Please provide a valid UDISE code' });
      return;
    }

    if (learners.length === 0) {
      setSubmitStatus({ type: 'error', message: 'Please add at least one learner' });
      return;
    }

    // Basic validation
    for (const learner of learners) {
      if (!learner.name || !learner.mobile || learner.mobile.length !== 10) {
        setSubmitStatus({ type: 'error', message: `Please fill all required fields for ${learner.name || 'all learners'}` });
        return;
      }
    }

    if (!surveyorName || !surveyorMobile || surveyorMobile.length !== 10) {
      setSubmitStatus({ type: 'error', message: 'Please provide valid surveyor details' });
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      const payload = {
        udiseCode,
        assessmentCentre,
        nyayPanchayat,
        learners,
        surveyorName,
        surveyorMobile
      };

      const response = await fetch(GAS_URL, {
        method: 'POST',
        mode: 'no-cors', // GAS requires no-cors for simple POST
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      // Since we use no-cors, we can't read the response body, 
      // but we can assume success if no error is thrown.
      setSubmitStatus({ type: 'success', message: 'Data submitted successfully to Google Sheets!' });
      
      // Reset form after success
      setTimeout(() => {
        setLearners([]);
        setUdiseCode('');
        setSurveyorName('');
        setSurveyorMobile('');
      }, 3000);

    } catch (error) {
      console.error('Submission error:', error);
      setSubmitStatus({ type: 'error', message: 'Failed to submit data. Check console for details.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#212529] font-sans p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-[#1A73E8] mb-2">
            Learner Registration Portal
          </h1>
          <p className="text-[#5F6368] max-w-2xl mx-auto">
            Register learners for the assessment program. Enter UDISE code to auto-populate center details.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Section 1: Center Details */}
          <section className="bg-white rounded-2xl shadow-sm border border-[#E0E0E0] p-6 md:p-8">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-full bg-[#E8F0FE] flex items-center justify-center text-[#1A73E8]">
                <Search size={18} />
              </div>
              <h2 className="text-xl font-semibold">Center Information</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#5F6368]">UDISE Code (11 Digits)</label>
                <div className="relative">
                  <input
                    type="text"
                    value={udiseCode}
                    onChange={(e) => setUdiseCode(e.target.value.replace(/\D/g, '').slice(0, 11))}
                    placeholder="e.g. 09050306705"
                    className="w-full px-4 py-2.5 rounded-lg border border-[#DADCE0] focus:ring-2 focus:ring-[#1A73E8] focus:border-transparent outline-none transition-all"
                    required
                  />
                  {isLoadingUdise && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Loader2 className="animate-spin text-[#1A73E8]" size={18} />
                    </div>
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#5F6368]">Name of Assessment Centre</label>
                <input
                  type="text"
                  value={assessmentCentre}
                  readOnly
                  placeholder="Auto-populated"
                  className="w-full px-4 py-2.5 rounded-lg border border-[#F1F3F4] bg-[#F1F3F4] text-[#70757A] cursor-not-allowed outline-none"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#5F6368]">Nyay Panchayat</label>
                <input
                  type="text"
                  value={nyayPanchayat}
                  readOnly
                  placeholder="Auto-populated"
                  className="w-full px-4 py-2.5 rounded-lg border border-[#F1F3F4] bg-[#F1F3F4] text-[#70757A] cursor-not-allowed outline-none"
                />
              </div>
            </div>
          </section>

          {/* Section 2: Learners Table */}
          <section className="bg-white rounded-2xl shadow-sm border border-[#E0E0E0] overflow-hidden">
            <div className="p-6 md:p-8 border-bottom border-[#E0E0E0] flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#E6F4EA] flex items-center justify-center text-[#1E8E3E]">
                  <Plus size={18} />
                </div>
                <h2 className="text-xl font-semibold">Learner Details</h2>
              </div>
              <button
                type="button"
                onClick={addLearner}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#1A73E8] text-white rounded-lg hover:bg-[#1765CC] transition-colors font-medium shadow-sm"
              >
                <Plus size={18} />
                Add Learner
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F8F9FA] border-y border-[#E0E0E0]">
                    <th className="px-4 py-3 text-xs font-semibold text-[#5F6368] uppercase tracking-wider whitespace-nowrap">Reg. No.</th>
                    <th className="px-4 py-3 text-xs font-semibold text-[#5F6368] uppercase tracking-wider whitespace-nowrap">Name (English)</th>
                    <th className="px-4 py-3 text-xs font-semibold text-[#5F6368] uppercase tracking-wider whitespace-nowrap">Father/Husband</th>
                    <th className="px-4 py-3 text-xs font-semibold text-[#5F6368] uppercase tracking-wider whitespace-nowrap">Mother</th>
                    <th className="px-4 py-3 text-xs font-semibold text-[#5F6368] uppercase tracking-wider whitespace-nowrap">Marital Status</th>
                    <th className="px-4 py-3 text-xs font-semibold text-[#5F6368] uppercase tracking-wider whitespace-nowrap">Age</th>
                    <th className="px-4 py-3 text-xs font-semibold text-[#5F6368] uppercase tracking-wider whitespace-nowrap">Gender</th>
                    <th className="px-4 py-3 text-xs font-semibold text-[#5F6368] uppercase tracking-wider whitespace-nowrap">Divyang?</th>
                    <th className="px-4 py-3 text-xs font-semibold text-[#5F6368] uppercase tracking-wider whitespace-nowrap">Type</th>
                    <th className="px-4 py-3 text-xs font-semibold text-[#5F6368] uppercase tracking-wider whitespace-nowrap">Category</th>
                    <th className="px-4 py-3 text-xs font-semibold text-[#5F6368] uppercase tracking-wider whitespace-nowrap">Mobile</th>
                    <th className="px-4 py-3 text-xs font-semibold text-[#5F6368] uppercase tracking-wider whitespace-nowrap">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E0E0E0]">
                  <AnimatePresence initial={false}>
                    {learners.map((learner, idx) => (
                      <motion.tr
                        key={learner.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="hover:bg-[#F1F3F4]/30 transition-colors"
                      >
                        <td className="px-4 py-4">
                          <input
                            type="text"
                            value={learner.registrationNo}
                            readOnly
                            className="w-36 px-2 py-1.5 rounded border border-transparent bg-transparent text-xs font-mono text-[#5F6368]"
                          />
                        </td>
                        <td className="px-4 py-4">
                          <input
                            type="text"
                            value={learner.name}
                            onChange={(e) => updateLearner(learner.id, 'name', e.target.value)}
                            placeholder="NAME"
                            className="w-40 px-3 py-1.5 rounded border border-[#DADCE0] focus:ring-1 focus:ring-[#1A73E8] outline-none text-sm"
                            required
                          />
                        </td>
                        <td className="px-4 py-4">
                          <input
                            type="text"
                            value={learner.fatherHusbandName}
                            onChange={(e) => updateLearner(learner.id, 'fatherHusbandName', e.target.value)}
                            placeholder="FATHER/HUSBAND"
                            className="w-40 px-3 py-1.5 rounded border border-[#DADCE0] focus:ring-1 focus:ring-[#1A73E8] outline-none text-sm"
                          />
                        </td>
                        <td className="px-4 py-4">
                          <input
                            type="text"
                            value={learner.motherName}
                            onChange={(e) => updateLearner(learner.id, 'motherName', e.target.value)}
                            placeholder="MOTHER"
                            className="w-40 px-3 py-1.5 rounded border border-[#DADCE0] focus:ring-1 focus:ring-[#1A73E8] outline-none text-sm"
                          />
                        </td>
                        <td className="px-4 py-4">
                          <select
                            value={learner.maritalStatus}
                            onChange={(e) => updateLearner(learner.id, 'maritalStatus', e.target.value)}
                            className="w-32 px-3 py-1.5 rounded border border-[#DADCE0] focus:ring-1 focus:ring-[#1A73E8] outline-none text-sm bg-white"
                          >
                            <option value="">Select</option>
                            {MARITAL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </td>
                        <td className="px-4 py-4">
                          <input
                            type="text"
                            value={learner.age}
                            onChange={(e) => updateLearner(learner.id, 'age', e.target.value)}
                            placeholder="Age"
                            className="w-16 px-3 py-1.5 rounded border border-[#DADCE0] focus:ring-1 focus:ring-[#1A73E8] outline-none text-sm"
                          />
                        </td>
                        <td className="px-4 py-4">
                          <select
                            value={learner.gender}
                            onChange={(e) => updateLearner(learner.id, 'gender', e.target.value as any)}
                            className="w-20 px-3 py-1.5 rounded border border-[#DADCE0] focus:ring-1 focus:ring-[#1A73E8] outline-none text-sm bg-white"
                          >
                            <option value="">Select</option>
                            <option value="M">M</option>
                            <option value="F">F</option>
                          </select>
                        </td>
                        <td className="px-4 py-4">
                          <select
                            value={learner.isDivyang}
                            onChange={(e) => updateLearner(learner.id, 'isDivyang', e.target.value as any)}
                            className="w-20 px-3 py-1.5 rounded border border-[#DADCE0] focus:ring-1 focus:ring-[#1A73E8] outline-none text-sm bg-white"
                          >
                            <option value="N">N</option>
                            <option value="Y">Y</option>
                          </select>
                        </td>
                        <td className="px-4 py-4">
                          <select
                            value={learner.divyangType}
                            onChange={(e) => updateLearner(learner.id, 'divyangType', e.target.value)}
                            disabled={learner.isDivyang === 'N'}
                            className={`w-40 px-3 py-1.5 rounded border border-[#DADCE0] focus:ring-1 focus:ring-[#1A73E8] outline-none text-sm bg-white ${learner.isDivyang === 'N' ? 'bg-[#F1F3F4] cursor-not-allowed' : ''}`}
                          >
                            <option value="">Select Type</option>
                            {DIVYANG_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </td>
                        <td className="px-4 py-4">
                          <select
                            value={learner.category}
                            onChange={(e) => updateLearner(learner.id, 'category', e.target.value as any)}
                            className="w-24 px-3 py-1.5 rounded border border-[#DADCE0] focus:ring-1 focus:ring-[#1A73E8] outline-none text-sm bg-white"
                          >
                            <option value="">Select</option>
                            <option value="GEN">GEN</option>
                            <option value="OBC">OBC</option>
                            <option value="SC">SC</option>
                            <option value="ST">ST</option>
                          </select>
                        </td>
                        <td className="px-4 py-4">
                          <input
                            type="text"
                            value={learner.mobile}
                            onChange={(e) => updateLearner(learner.id, 'mobile', e.target.value)}
                            placeholder="10 digits"
                            className="w-32 px-3 py-1.5 rounded border border-[#DADCE0] focus:ring-1 focus:ring-[#1A73E8] outline-none text-sm"
                            required
                          />
                        </td>
                        <td className="px-4 py-4">
                          <button
                            type="button"
                            onClick={() => removeLearner(learner.id)}
                            className="p-2 text-[#EA4335] hover:bg-[#FCE8E6] rounded-full transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                  {learners.length === 0 && (
                    <tr>
                      <td colSpan={12} className="px-4 py-12 text-center text-[#70757A]">
                        No learners added yet. Click "Add Learner" to start.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 3: Surveyor Details */}
          <section className="bg-white rounded-2xl shadow-sm border border-[#E0E0E0] p-6 md:p-8">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-full bg-[#FEEFC3] flex items-center justify-center text-[#F29900]">
                <CheckCircle2 size={18} />
              </div>
              <h2 className="text-xl font-semibold">Surveyor Information</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#5F6368]">Name of Surveyor</label>
                <input
                  type="text"
                  value={surveyorName}
                  onChange={(e) => setSurveyorName(e.target.value.toUpperCase().replace(/[^A-Z\s]/g, ''))}
                  placeholder="SURVEYOR NAME"
                  className="w-full px-4 py-2.5 rounded-lg border border-[#DADCE0] focus:ring-2 focus:ring-[#1A73E8] focus:border-transparent outline-none transition-all"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#5F6368]">Mobile no of Surveyor</label>
                <input
                  type="text"
                  value={surveyorMobile}
                  onChange={(e) => setSurveyorMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="10 Digit Mobile Number"
                  className="w-full px-4 py-2.5 rounded-lg border border-[#DADCE0] focus:ring-2 focus:ring-[#1A73E8] focus:border-transparent outline-none transition-all"
                  required
                />
              </div>
            </div>
          </section>

          {/* Status Messages */}
          <AnimatePresence>
            {submitStatus && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className={`p-4 rounded-xl flex items-center gap-3 ${
                  submitStatus.type === 'success' 
                    ? 'bg-[#E6F4EA] text-[#1E8E3E] border border-[#34A853]/20' 
                    : 'bg-[#FCE8E6] text-[#EA4335] border border-[#EA4335]/20'
                }`}
              >
                {submitStatus.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                <p className="font-medium">{submitStatus.message}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Submit Button */}
          <div className="flex justify-center pb-12">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`
                inline-flex items-center gap-3 px-12 py-4 rounded-full text-lg font-semibold shadow-lg transition-all
                ${isSubmitting 
                  ? 'bg-[#DADCE0] text-[#70757A] cursor-not-allowed' 
                  : 'bg-[#1A73E8] text-white hover:bg-[#1765CC] hover:shadow-xl active:scale-95'}
              `}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin" size={24} />
                  Submitting...
                </>
              ) : (
                <>
                  <Save size={24} />
                  Submit All Data
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
