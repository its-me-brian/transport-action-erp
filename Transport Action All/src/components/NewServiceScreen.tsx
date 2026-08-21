import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  MapPin, 
  Flag, 
  Check, 
  Search, 
  Calendar, 
  Clock, 
  User, 
  ChevronDown,
  Loader2,
  AlertCircle,
  Plus
} from 'lucide-react';
import { Service, ScreenId } from '../types';
import { getProjects, getDrivers, createService, createDriverOnTheFly, getVehicleTypes, getServiceTypes } from '../services/api';
import { useToast } from '../contexts/ToastContext';

interface NewServiceScreenProps {
  onAddService: (newService: Service) => void;
  onNavigate: (screen: ScreenId, transition?: 'none' | 'slide_up' | 'push' | 'push_back') => void;
}

export default function NewServiceScreen({ onAddService, onNavigate }: NewServiceScreenProps) {
  const { showToast } = useToast();

  // Form states
  const [company, setCompany] = useState<'Transport Action' | 'Movie Motion'>('Transport Action');
  const [project, setProject] = useState('');
  const [serviceDate, setServiceDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [callTime, setCallTime] = useState('08:00');
  const [serviceType, setServiceType] = useState('Dispo');
  const [vehicleType, setVehicleType] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [passengers, setPassengers] = useState('');
  const [section, setSection] = useState('');
  const [flightInfo, setFlightInfo] = useState('');
  const [notes, setNotes] = useState('');
  const [pickupLocation, setPickupLocation] = useState('');
  const [dropoffLocation, setDropoffLocation] = useState('');

  // Validation errors (onBlur)
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Save state
  const [isSaving, setIsSaving] = useState(false);

  // Dynamic data from API
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [drivers, setDrivers] = useState<{ id: string; name: string; phone?: string }[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<string[]>([]);
  const [serviceTypes, setServiceTypes] = useState<string[]>([]);

  // Driver autocomplete state
  const [driverSearch, setDriverSearch] = useState('');
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [showDriverDropdown, setShowDriverDropdown] = useState(false);
  const driverRef = useRef<HTMLDivElement>(null);

  // Create driver on-the-fly modal state
  const [showCreateDriverModal, setShowCreateDriverModal] = useState(false);
  const [newDriverPhone, setNewDriverPhone] = useState('');
  const [isCreatingDriver, setIsCreatingDriver] = useState(false);

  useEffect(() => {
    getProjects().then(p => { if (Array.isArray(p)) setProjects(p.map((x: any) => ({ id: x.id, name: x.name }))); }).catch(e => console.error('Failed to load projects:', e));
    getDrivers().then(d => { if (Array.isArray(d)) setDrivers(d.map((x: any) => ({ id: x.id || x.name, name: x.name, phone: x.phone }))); }).catch(e => console.error('Failed to load drivers:', e));
    getVehicleTypes().then(vt => setVehicleTypes(vt)).catch(() => {});
    getServiceTypes().then(st => setServiceTypes(st)).catch(() => {});
  }, []);

  // Close driver dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (driverRef.current && !driverRef.current.contains(e.target as Node)) {
        setShowDriverDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter drivers by search
  const filteredDrivers = driverSearch.trim()
    ? drivers.filter(d => d.name.toLowerCase().includes(driverSearch.toLowerCase()))
    : drivers;

  const exactMatch = drivers.find(d => d.name.toLowerCase() === driverSearch.toLowerCase());

  // Handle driver creation on-the-fly
  const handleCreateDriverOnTheFly = async () => {
    if (!driverSearch.trim()) return;
    if (!newDriverPhone.trim()) {
      showToast('Phone number is required', 'error');
      return;
    }

    setIsCreatingDriver(true);
    const result = await createDriverOnTheFly({
      name: driverSearch.trim(),
      phone: newDriverPhone.trim(),
      operatingCompany: company,
    });
    setIsCreatingDriver(false);

    if (result.error) {
      showToast(result.error, 'error');
      return;
    }

    if (result.id) {
      // Add the new driver to the local list
      setDrivers(prev => [...prev, { id: result.id!, name: result.name || driverSearch.trim(), phone: newDriverPhone.trim() }]);
      setSelectedDriverId(result.id!);
      setDriverSearch(result.name || driverSearch.trim());
      setShowCreateDriverModal(false);
      setNewDriverPhone('');
      showToast('Driver created successfully', 'success');
    }
  };

  // onBlur validation
  const validateField = (name: string, value: string) => {
    if (name === 'project' && !value) {
      setErrors(prev => ({ ...prev, project: 'Please select a project' }));
    } else if (name === 'pickupLocation' && !value.trim()) {
      setErrors(prev => ({ ...prev, pickupLocation: 'Pickup location is required' }));
    } else if (name === 'dropoffLocation' && !value.trim()) {
      setErrors(prev => ({ ...prev, dropoffLocation: 'Dropoff location is required' }));
    } else {
      setErrors(prev => { const next = { ...prev }; delete next[name]; return next; });
    }
  };

  // Save Service handler
  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all required fields
    const newErrors: Record<string, string> = {};
    if (!project) newErrors.project = 'Please select a project';
    if (!pickupLocation.trim()) newErrors.pickupLocation = 'Pickup location is required';
    if (!dropoffLocation.trim()) newErrors.dropoffLocation = 'Dropoff location is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      showToast('Please fill out all required fields', 'error');
      return;
    }

    setIsSaving(true);

    // Format date as DD/MM/YYYY for display
    let displayDate = '';
    if (serviceDate) {
      const d = new Date(serviceDate);
      if (!isNaN(d.getTime())) {
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        displayDate = `${day}/${month}/${year}`;
      }
    }

    // Call backend API to persist the service
    const result = await createService({
      ProjectID: project,
      Date: serviceDate,
      Time: `${callTime} - 16:00`,
      OperatingCompany: company,
      DriverID: selectedDriverId || undefined,
      PassengerName: passengers,
      Section: section,
      FlightInfo: flightInfo,
      Notes: notes,
      PickupLines: [pickupLocation],
      DropoffLines: [dropoffLocation],
      ServiceType: serviceType,
      VehicleType: vehicleType,
      SourceType: 'manual',
    });

    setIsSaving(false);

    if (result.error) {
      showToast('Error creating service: ' + result.error, 'error');
      return;
    }

    if (!result.id) {
      showToast('Error: backend did not return an ID', 'error');
      return;
    }

    // Pass the real service ID from backend
    onAddService({
      id: result.id,
      time: `${callTime} - 16:00`,
      status: 'Scheduled',
      operationalStatus: 'Importado',
      financialStatus: 'Pendiente',
      title: `${project}`,
      company,
      project: project || '',
      location: pickupLocation,
      driverName: driverSearch || 'Driver Unassigned',
      date: displayDate,
      startTime: callTime || '',
      endTime: '16:00',
      kmTotal: 0,
      kmOver: 0,
      diariaType: 'none',
      rawText: '',
      serviceType,
      vehicleType: vehicleType || undefined,
      vehiclePlate: vehiclePlate || undefined,
      passengers: passengers || undefined,
      notes: notes || undefined,
      revenueBreakdown: { base: 0, kmOver: 0, hoursOver: 0, diaria: 0, notturno: 0 },
      costBreakdown: { base: 0, kmOver: 0, hoursOver: 0, diaria: 0, notturno: 0 },
      revenueValidated: false,
      costValidated: false,
    });

    showToast('Service created successfully', 'success');
    onNavigate('transport', 'push_back');
  };

  const sectionVariants = {
    hidden: { opacity: 0, y: 8 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.25 } },
  };

  return (
    <div id="new-service-screen" className="h-full overflow-y-auto bg-background text-on-surface font-sans flex flex-col w-full">
      {/* Header */}
      <header id="new-service-header" className="w-full flex items-center justify-between px-4 md:px-6 py-3 sticky top-0 bg-surface/90 backdrop-blur-md z-10 border-b border-outline-variant/50">
        <div 
          id="cancel-entry-div"
          onClick={() => onNavigate('dashboard', 'push_back')}
          className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity px-2.5 py-1 rounded-lg border border-outline-variant bg-surface-container-lowest"
        >
          <X className="w-3.5 h-3.5 text-on-surface-variant" />
          <span className="text-[11px] text-on-surface-variant font-medium">Cancel</span>
        </div>

        <div className="text-[16px] font-semibold text-primary">
          New Service
        </div>

        <div className="w-[80px] hidden sm:block"></div>
      </header>

      {/* Form Content */}
      <main id="new-service-form-container" className="flex-1 w-full max-w-xl mx-auto px-4 md:px-6 py-6 flex flex-col gap-4">
        <form onSubmit={handleSaveService} className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 space-y-4">
          
          {/* Section: Company & Project */}
          <motion.div variants={sectionVariants} initial="hidden" animate="visible">
            <h3 className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-widest mb-3">General Information</h3>
            
            {/* Company Toggle */}
            <div className="mb-3">
              <label className="block text-[11px] text-on-surface-variant uppercase tracking-wide font-medium mb-1">
                Operating Company
              </label>
              <div className="grid grid-cols-2 bg-surface-dim p-0.5 rounded-lg gap-0.5">
                <button
                  type="button"
                  id="company-toggle-ta-btn"
                  onClick={() => setCompany('Transport Action')}
                  className={`py-2 text-center rounded cursor-pointer transition-colors text-[12px] font-medium ${
                    company === 'Transport Action'
                      ? 'bg-surface-container-lowest text-primary'
                      : 'text-on-surface-variant hover:bg-surface-container'
                  }`}
                >
                  Transport Action
                </button>
                <button
                  type="button"
                  id="company-toggle-mm-btn"
                  onClick={() => setCompany('Movie Motion')}
                  className={`py-2 text-center rounded cursor-pointer transition-colors text-[12px] font-medium ${
                    company === 'Movie Motion'
                      ? 'bg-surface-container-lowest text-primary'
                      : 'text-on-surface-variant hover:bg-surface-container'
                  }`}
                >
                  Movie Motion
                </button>
              </div>
            </div>

            {/* Project Selection */}
            <div>
              <label className="block text-[11px] text-on-surface-variant uppercase tracking-wide font-medium mb-1">
                Project *
              </label>
              <div className="relative">
                <select
                  id="project-select-field"
                  value={project}
                  onChange={(e) => { setProject(e.target.value); validateField('project', e.target.value); }}
                  onBlur={() => validateField('project', project)}
                  className={`w-full bg-surface-container-lowest border rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary transition-colors cursor-pointer appearance-none ${
                    errors.project ? 'border-red-400' : 'border-outline-variant'
                  }`}
                >
                  <option value="">Select project...</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.name}>{p.name}</option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-on-surface-variant absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              {errors.project && (
                <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {errors.project}
                </p>
              )}
            </div>
          </motion.div>

          {/* Section: Schedule */}
          <motion.div variants={sectionVariants} initial="hidden" animate="visible" transition={{ delay: 0.05 }}>
            <h3 className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-widest mb-3">Schedule</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-on-surface-variant uppercase tracking-wide font-medium mb-1">
                  Service Date
                </label>
                <div className="relative">
                  <input 
                    type="date"
                    value={serviceDate}
                    onChange={(e) => setServiceDate(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg pl-9 pr-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary transition-colors"
                  />
                  <Calendar className="w-4 h-4 text-on-surface-variant absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-on-surface-variant uppercase tracking-wide font-medium mb-1">
                  Call Time
                </label>
                <div className="relative">
                  <input 
                    type="time"
                    value={callTime}
                    onChange={(e) => setCallTime(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg pl-9 pr-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary transition-colors"
                  />
                  <Clock className="w-4 h-4 text-on-surface-variant absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-on-surface-variant uppercase tracking-wide font-medium mb-1">
                  Service Type
                </label>
                <div className="relative">
                  <select
                    value={serviceType}
                    onChange={(e) => setServiceType(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary transition-colors cursor-pointer appearance-none"
                  >
                    <option value="Dispo">Dispo</option>
                    {serviceTypes.filter(st => st !== 'Dispo').map(st => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-on-surface-variant absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Section: Vehicle & Details */}
          <motion.div variants={sectionVariants} initial="hidden" animate="visible" transition={{ delay: 0.08 }}>
            <h3 className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-widest mb-3">Vehicle & Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-on-surface-variant uppercase tracking-wide font-medium mb-1">
                  Vehicle Type
                </label>
                <div className="relative">
                  <select
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary transition-colors cursor-pointer appearance-none"
                  >
                    <option value="">Select type...</option>
                    {vehicleTypes.map(vt => (
                      <option key={vt} value={vt}>{vt}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-on-surface-variant absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-[11px] text-on-surface-variant uppercase tracking-wide font-medium mb-1">
                  Plate
                </label>
                <input
                  type="text"
                  placeholder="AB 123 CD"
                  value={vehiclePlate}
                  onChange={(e) => setVehiclePlate(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary transition-colors"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
              <div>
                <label className="block text-[11px] text-on-surface-variant uppercase tracking-wide font-medium mb-1">
                  Passengers
                </label>
                <input
                  type="text"
                  placeholder="Name1; Name2; Name3"
                  value={passengers}
                  onChange={(e) => setPassengers(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary transition-colors"
                />
              </div>
              <div>
                <label className="block text-[11px] text-on-surface-variant uppercase tracking-wide font-medium mb-1">
                  Section
                </label>
                <input
                  type="text"
                  placeholder="e.g. ROMA, PUGLIA"
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary transition-colors"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
              <div>
                <label className="block text-[11px] text-on-surface-variant uppercase tracking-wide font-medium mb-1">
                  Flight Info
                </label>
                <input
                  type="text"
                  placeholder="e.g. AZ1234 Arriving 14:30"
                  value={flightInfo}
                  onChange={(e) => setFlightInfo(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary transition-colors"
                />
              </div>
              <div>
                <label className="block text-[11px] text-on-surface-variant uppercase tracking-wide font-medium mb-1">
                  Notes
                </label>
                <input
                  type="text"
                  placeholder="Additional notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary transition-colors"
                />
              </div>
            </div>
          </motion.div>

          {/* Section: Assignment */}
          <motion.div variants={sectionVariants} initial="hidden" animate="visible" transition={{ delay: 0.1 }}>
            <h3 className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-widest mb-3">Assignment</h3>
            <div>
              <label className="block text-[11px] text-on-surface-variant uppercase tracking-wide font-medium mb-1">
                Assigned Driver
              </label>
              <div className="relative" ref={driverRef}>
                <input 
                  type="text"
                  placeholder="Search drivers..."
                  value={driverSearch}
                  onChange={(e) => {
                    setDriverSearch(e.target.value);
                    setSelectedDriverId('');
                    setShowDriverDropdown(true);
                  }}
                  onFocus={() => setShowDriverDropdown(true)}
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg pl-9 pr-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary transition-colors"
                />
                <User className="w-4 h-4 text-on-surface-variant absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                
                {/* Dropdown */}
                {showDriverDropdown && driverSearch.trim() && (
                  <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-surface-container-lowest border border-outline-variant rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {filteredDrivers.length > 0 && filteredDrivers.map(d => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => {
                          setDriverSearch(d.name);
                          setSelectedDriverId(d.id);
                          setShowDriverDropdown(false);
                        }}
                        className="w-full text-left px-3 py-2 text-[13px] hover:bg-surface-container transition-colors flex items-center gap-2"
                      >
                        <User className="w-3.5 h-3.5 text-on-surface-variant" />
                        <span>{d.name}</span>
                        {d.phone && <span className="text-[11px] text-on-surface-variant ml-auto">{d.phone}</span>}
                      </button>
                    ))}
                    
                    {/* Create new driver option */}
                    {!exactMatch && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowDriverDropdown(false);
                          setShowCreateDriverModal(true);
                        }}
                        className="w-full text-left px-3 py-2 text-[13px] hover:bg-primary-container transition-colors flex items-center gap-2 border-t border-outline-variant/50 text-primary"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Create new driver: <strong>{driverSearch}</strong></span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          <hr className="border-t border-outline-variant/50" />

          {/* Section: Route */}
          <motion.div variants={sectionVariants} initial="hidden" animate="visible" transition={{ delay: 0.15 }}>
            <h3 className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-widest mb-3">Route</h3>
            <div className="relative pl-6 border-l-2 border-dashed border-outline-variant space-y-3">
              <div className="absolute left-[-5px] top-[36px] w-2.5 h-2.5 bg-surface-container-lowest border-2 border-outline-variant rounded-full"></div>
              <div className="absolute left-[-5px] bottom-[28px] w-2.5 h-2.5 bg-primary border-2 border-surface-container-lowest rounded-full"></div>

              <div>
                <label className="block text-[11px] text-on-surface-variant uppercase tracking-wide font-medium mb-1">
                  Pickup Location *
                </label>
                <div className="relative">
                  <input 
                    type="text"
                    placeholder="Enter origin address"
                    value={pickupLocation}
                    onChange={(e) => { setPickupLocation(e.target.value); validateField('pickupLocation', e.target.value); }}
                    onBlur={() => validateField('pickupLocation', pickupLocation)}
                    className={`w-full bg-surface-container-lowest border rounded-lg pl-9 pr-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary transition-colors ${
                      errors.pickupLocation ? 'border-red-400' : 'border-outline-variant'
                    }`}
                  />
                  <MapPin className="w-4 h-4 text-on-surface-variant absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                {errors.pickupLocation && (
                  <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.pickupLocation}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[11px] text-on-surface-variant uppercase tracking-wide font-medium mb-1">
                  Dropoff Location *
                </label>
                <div className="relative">
                  <input 
                    type="text"
                    placeholder="Enter destination"
                    value={dropoffLocation}
                    onChange={(e) => { setDropoffLocation(e.target.value); validateField('dropoffLocation', e.target.value); }}
                    onBlur={() => validateField('dropoffLocation', dropoffLocation)}
                    className={`w-full bg-surface-container-lowest border rounded-lg pl-9 pr-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary transition-colors ${
                      errors.dropoffLocation ? 'border-red-400' : 'border-outline-variant'
                    }`}
                  />
                  <Flag className="w-4 h-4 text-on-surface-variant absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                {errors.dropoffLocation && (
                  <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.dropoffLocation}
                  </p>
                )}
              </div>
            </div>
          </motion.div>

          {/* Submit Actions */}
          <div className="flex flex-col sm:flex-row gap-2 justify-end pt-2">
            <button 
              type="button"
              onClick={() => onNavigate('dashboard', 'push_back')}
              className="px-4 py-2 rounded-lg text-[12px] font-medium text-on-surface bg-surface-dim hover:bg-surface-container transition-colors text-center"
            >
              Save Draft
            </button>
            <button 
              type="submit"
              id="save-service-btn"
              disabled={isSaving}
              className="px-4 py-2 rounded-lg text-[12px] font-medium text-on-primary bg-primary hover:bg-primary-hover transition-colors text-center flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Save Service</span>
                </>
              )}
            </button>
          </div>

        </form>
      </main>

      {/* Create Driver On-The-Fly Modal */}
      <AnimatePresence>
        {showCreateDriverModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
            onClick={() => { setShowCreateDriverModal(false); setNewDriverPhone(''); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-xl w-full max-w-sm mx-4 max-h-[90vh] flex flex-col"
            >
              <div className="flex items-center justify-between px-5 py-4 shrink-0">
                <h3 className="text-[14px] font-semibold text-on-surface">Create New Driver</h3>
                <button
                  type="button"
                  onClick={() => { setShowCreateDriverModal(false); setNewDriverPhone(''); }}
                  className="p-1 rounded hover:bg-surface-container transition-colors"
                >
                  <X className="w-4 h-4 text-on-surface-variant" />
                </button>
              </div>

              <div className="px-5 py-4 space-y-4 overflow-y-auto flex-1 min-h-0">
                <p className="text-[12px] text-on-surface-variant">
                  Driver: <strong className="text-on-surface">{driverSearch}</strong>
                </p>

                <div>
                  <label className="block text-[11px] text-on-surface-variant uppercase tracking-wide font-medium mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    placeholder="+34 600 000 000"
                    value={newDriverPhone}
                    onChange={(e) => setNewDriverPhone(e.target.value)}
                    autoFocus
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end px-5 py-4 shrink-0">
                <button
                  type="button"
                  onClick={() => { setShowCreateDriverModal(false); setNewDriverPhone(''); }}
                  className="px-3 py-1.5 rounded-lg text-[12px] font-medium text-on-surface bg-surface-dim hover:bg-surface-container transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateDriverOnTheFly}
                  disabled={isCreatingDriver || !newDriverPhone.trim()}
                  className="px-3 py-1.5 rounded-lg text-[12px] font-medium text-on-primary bg-primary hover:bg-primary-hover transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreatingDriver ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      Create Driver
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
