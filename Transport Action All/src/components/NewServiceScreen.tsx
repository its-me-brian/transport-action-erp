import React from 'react';
import { motion } from 'motion/react';
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
import { useToast } from '../contexts/ToastContext';
import useNewServiceForm from '../hooks/useNewServiceForm';
import { CreateDriverModal } from './NewServiceSections';

interface NewServiceScreenProps {
  onAddService: (newService: Service) => void;
  onNavigate: (screen: ScreenId, transition?: 'none' | 'slide_up' | 'push' | 'push_back') => void;
}

export default function NewServiceScreen({ onAddService, onNavigate }: NewServiceScreenProps) {
  const { showToast } = useToast();
  const {
    company, setCompany,
    project, setProject,
    serviceDate, setServiceDate,
    callTime, setCallTime,
    serviceType, setServiceType,
    vehicleType, setVehicleType,
    vehiclePlate, setVehiclePlate,
    passengers, setPassengers,
    section, setSection,
    flightInfo, setFlightInfo,
    notes, setNotes,
    pickupLocation, setPickupLocation,
    dropoffLocation, setDropoffLocation,
    errors, validateField,
    isSaving, handleSaveService,
    projects, drivers, setDrivers,
    vehicleTypes, serviceTypes,
    driverSearch, setDriverSearch,
    selectedDriverId, setSelectedDriverId,
    showDriverDropdown, setShowDriverDropdown,
    filteredDrivers, exactMatch, driverRef,
    showCreateDriverModal, setShowCreateDriverModal,
    newDriverPhone, setNewDriverPhone,
  } = useNewServiceForm({ onAddService, onNavigate });

  const sectionVariants = {
    hidden: { opacity: 0, y: 8 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.25 } },
  };

  return (
    <div id="new-service-screen" className="h-full overflow-y-auto bg-background text-on-surface font-sans flex flex-col w-full pb-24">
      {/* Header */}
      <header id="new-service-header" className="w-full flex items-center justify-between px-4 md:px-6 py-3 sticky top-0 bg-surface/90 backdrop-blur-md z-10 border-b border-outline-variant/50">
        <div 
          id="cancel-entry-div"
          onClick={() => onNavigate('transport', 'push_back')}
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
                  aria-label="Search drivers"
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
              onClick={() => onNavigate('transport', 'push_back')}
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

      {showCreateDriverModal && (
        <CreateDriverModal
          isOpen={showCreateDriverModal}
          driverName={driverSearch}
          company={company}
          onClose={() => {
            setShowCreateDriverModal(false);
            setNewDriverPhone('');
          }}
          onCreated={(id, name) => {
            setDrivers(prev => [...prev, { id, name, phone: newDriverPhone }]);
            setSelectedDriverId(id);
            setDriverSearch(name);
            setShowCreateDriverModal(false);
            setNewDriverPhone('');
            showToast('Driver created successfully', 'success');
          }}
        />
      )}
    </div>
  );
}
