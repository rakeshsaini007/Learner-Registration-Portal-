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
  const [isUpdateMode, setIsUpdateMode] = useState(false);
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
  // Removed redundant useEffect that was overwriting fetched data

  // --- Handlers ---

  const fetchUdiseInfo = async (code: string) => {
    setIsLoadingUdise(true);
    setSubmitStatus(null);
    try {
      console.log('Fetching data for UDISE:', code);
      const response = await fetch(`${GAS_URL}?action=fetchUdise&udiseCode=${code}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });
      
      const text = await response.text();
      console.log('Raw response:', text);
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error('Invalid response from server');
      }

      if (data.success) {
        console.log('Data found:', data);
        setAssessmentCentre(data.assessmentCentre);
        setNyayPanchayat(data.nyayPanchayat);
        
        if (data.existingLearners && data.existingLearners.length > 0) {
          console.log('Loading existing learners:', data.existingLearners.length);
          setIsUpdateMode(true);
          setLearners(data.existingLearners.map((l: any) => ({
            ...l,
            id: Math.random().toString(36).substr(2, 9)
          })));
          setSurveyorName(data.surveyorName || '');
          setSurveyorMobile(data.surveyorMobile || '');
          setSubmitStatus({ type: 'success', message: 'Existing data found and loaded for this UDISE code.' });
        } else {
          console.log('No existing learners found for this UDISE.');
          setIsUpdateMode(false);
          setLearners([]);
          setSurveyorName('');
          setSurveyorMobile('');
        }
      } else {
        console.log('UDISE not found in Sheet1');
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

  const isValidIndianMobile = (num: string) => {
    return /^[6-9]\d{9}$/.test(num);
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
          // Optional: Enforce first digit 6-9 immediately or just validate later
          if (processedValue.length > 0 && !/^[6-9]/.test(processedValue)) {
            processedValue = ''; // Clear if invalid start
          }
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
      if (!learner.name) {
        setSubmitStatus({ type: 'error', message: `Please enter name for all learners` });
        return;
      }
      if (!isValidIndianMobile(learner.mobile)) {
        setSubmitStatus({ type: 'error', message: `Invalid mobile number for ${learner.name || 'a learner'}. Must be 10 digits starting with 6, 7, 8, or 9.` });
        return;
      }
    }

    if (!surveyorName) {
      setSubmitStatus({ type: 'error', message: 'Please provide surveyor name' });
      return;
    }

    if (!isValidIndianMobile(surveyorMobile)) {
      setSubmitStatus({ type: 'error', message: 'Invalid surveyor mobile number. Must be 10 digits starting with 6, 7, 8, or 9.' });
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
        surveyorMobile,
        isUpdate: isUpdateMode
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
      const successMsg = isUpdateMode ? 'Data updated successfully in Google Sheets!' : 'Data saved successfully to Google Sheets!';
      setSubmitStatus({ type: 'success', message: successMsg });
      alert(successMsg);
      
      // Reset form after success
      setTimeout(() => {
        setLearners([]);
        setUdiseCode('');
        setSurveyorName('');
        setSurveyorMobile('');
        setIsUpdateMode(false);
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

          {/* Section 2: Learner Details Cards */}
          <section className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
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

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              <AnimatePresence initial={false}>
                {learners.map((learner, idx) => (
                  <motion.div
                    key={learner.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white rounded-2xl shadow-sm border border-[#E0E0E0] overflow-hidden flex flex-col"
                  >
                    {/* Card Header */}
                    <div className="px-5 py-3 bg-[#F8F9FA] border-b border-[#E0E0E0] flex items-center justify-between">
                      <span className="text-xs font-mono font-semibold text-[#5F6368] bg-[#E8F0FE] px-2 py-1 rounded">
                        #{learner.registrationNo || 'PENDING'}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeLearner(learner.id)}
                        className="p-1.5 text-[#EA4335] hover:bg-[#FCE8E6] rounded-full transition-colors"
                        title="Remove Learner"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    {/* Card Body */}
                    <div className="p-5 space-y-4 flex-grow">
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-[#5F6368] uppercase tracking-wider">Name of Learner (English)</label>
                        <input
                          type="text"
                          value={learner.name}
                          onChange={(e) => updateLearner(learner.id, 'name', e.target.value)}
                          placeholder="FULL NAME"
                          className="w-full px-3 py-2 rounded-lg border border-[#DADCE0] focus:ring-2 focus:ring-[#1A73E8] focus:border-transparent outline-none text-sm transition-all"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-[#5F6368] uppercase tracking-wider">Father/Husband</label>
                          <input
                            type="text"
                            value={learner.fatherHusbandName}
                            onChange={(e) => updateLearner(learner.id, 'fatherHusbandName', e.target.value)}
                            placeholder="NAME"
                            className="w-full px-3 py-2 rounded-lg border border-[#DADCE0] focus:ring-2 focus:ring-[#1A73E8] outline-none text-sm"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-[#5F6368] uppercase tracking-wider">Mother</label>
                          <input
                            type="text"
                            value={learner.motherName}
                            onChange={(e) => updateLearner(learner.id, 'motherName', e.target.value)}
                            placeholder="NAME"
                            className="w-full px-3 py-2 rounded-lg border border-[#DADCE0] focus:ring-2 focus:ring-[#1A73E8] outline-none text-sm"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-[#5F6368] uppercase tracking-wider">Marital Status</label>
                          <select
                            value={learner.maritalStatus}
                            onChange={(e) => updateLearner(learner.id, 'maritalStatus', e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-[#DADCE0] focus:ring-2 focus:ring-[#1A73E8] outline-none text-sm bg-white"
                          >
                            <option value="">Select</option>
                            {MARITAL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-[#5F6368] uppercase tracking-wider">Age</label>
                          <input
                            type="text"
                            value={learner.age}
                            onChange={(e) => updateLearner(learner.id, 'age', e.target.value)}
                            placeholder="Years"
                            className="w-full px-3 py-2 rounded-lg border border-[#DADCE0] focus:ring-2 focus:ring-[#1A73E8] outline-none text-sm"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-[#5F6368] uppercase tracking-wider">Gender</label>
                          <select
                            value={learner.gender}
                            onChange={(e) => updateLearner(learner.id, 'gender', e.target.value as any)}
                            className="w-full px-3 py-2 rounded-lg border border-[#DADCE0] focus:ring-2 focus:ring-[#1A73E8] outline-none text-sm bg-white"
                          >
                            <option value="">Select</option>
                            <option value="M">Male</option>
                            <option value="F">Female</option>
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-[#5F6368] uppercase tracking-wider">Category</label>
                          <select
                            value={learner.category}
                            onChange={(e) => updateLearner(learner.id, 'category', e.target.value as any)}
                            className="w-full px-3 py-2 rounded-lg border border-[#DADCE0] focus:ring-2 focus:ring-[#1A73E8] outline-none text-sm bg-white"
                          >
                            <option value="">Select</option>
                            <option value="GEN">GEN</option>
                            <option value="OBC">OBC</option>
                            <option value="SC">SC</option>
                            <option value="ST">ST</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-[#5F6368] uppercase tracking-wider">Divyang?</label>
                          <select
                            value={learner.isDivyang}
                            onChange={(e) => updateLearner(learner.id, 'isDivyang', e.target.value as any)}
                            className="w-full px-3 py-2 rounded-lg border border-[#DADCE0] focus:ring-2 focus:ring-[#1A73E8] outline-none text-sm bg-white"
                          >
                            <option value="N">No</option>
                            <option value="Y">Yes</option>
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-[#5F6368] uppercase tracking-wider">Mobile</label>
                          <input
                            type="text"
                            value={learner.mobile}
                            onChange={(e) => updateLearner(learner.id, 'mobile', e.target.value)}
                            placeholder="10 digits"
                            className={`w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-[#1A73E8] outline-none text-sm ${
                              learner.mobile && !isValidIndianMobile(learner.mobile) 
                                ? 'border-[#EA4335] bg-[#FCE8E6]/20' 
                                : 'border-[#DADCE0]'
                            }`}
                            required
                          />
                        </div>
                      </div>

                      {learner.isDivyang === 'Y' && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="space-y-1.5"
                        >
                          <label className="text-[11px] font-bold text-[#5F6368] uppercase tracking-wider">Type of Divyang</label>
                          <select
                            value={learner.divyangType}
                            onChange={(e) => updateLearner(learner.id, 'divyangType', e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-[#DADCE0] focus:ring-2 focus:ring-[#1A73E8] outline-none text-sm bg-white"
                          >
                            <option value="">Select Type</option>
                            {DIVYANG_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {learners.length === 0 && (
              <div className="bg-white rounded-2xl border-2 border-dashed border-[#DADCE0] p-12 text-center">
                <p className="text-[#70757A] mb-4">No learners added yet.</p>
                <button
                  type="button"
                  onClick={addLearner}
                  className="inline-flex items-center gap-2 px-6 py-2 bg-[#E8F0FE] text-[#1A73E8] rounded-lg hover:bg-[#D2E3FC] transition-colors font-medium"
                >
                  <Plus size={18} />
                  Add First Learner
                </button>
              </div>
            )}
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
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                    if (val.length === 0 || /^[6-9]/.test(val)) {
                      setSurveyorMobile(val);
                    }
                  }}
                  placeholder="10 Digit Mobile Number"
                  className={`w-full px-4 py-2.5 rounded-lg border focus:ring-2 focus:ring-[#1A73E8] focus:border-transparent outline-none transition-all ${
                    surveyorMobile && !isValidIndianMobile(surveyorMobile)
                      ? 'border-[#EA4335] bg-[#FCE8E6]/20'
                      : 'border-[#DADCE0]'
                  }`}
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
                  {isUpdateMode ? 'Updating...' : 'Submitting...'}
                </>
              ) : (
                <>
                  <Save size={24} />
                  {isUpdateMode ? 'Update All Data' : 'Submit All Data'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
