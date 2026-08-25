import { useState, useEffect, useRef } from 'react';
import { Service, ScreenId } from '../types';
import { getProjects, getDrivers, createService, getVehicleTypes, getServiceTypes } from '../services/api';
import { useToast } from '../contexts/ToastContext';

export interface UseNewServiceFormReturn {
  company: 'Transport Action' | 'Movie Motion';
  setCompany: React.Dispatch<React.SetStateAction<'Transport Action' | 'Movie Motion'>>;
  project: string;
  setProject: (val: string) => void;
  serviceDate: string;
  setServiceDate: (val: string) => void;
  callTime: string;
  setCallTime: (val: string) => void;
  serviceType: string;
  setServiceType: (val: string) => void;
  vehicleType: string;
  setVehicleType: (val: string) => void;
  vehiclePlate: string;
  setVehiclePlate: (val: string) => void;
  passengers: string;
  setPassengers: (val: string) => void;
  section: string;
  setSection: (val: string) => void;
  flightInfo: string;
  setFlightInfo: (val: string) => void;
  notes: string;
  setNotes: (val: string) => void;
  pickupLocation: string;
  setPickupLocation: (val: string) => void;
  dropoffLocation: string;
  setDropoffLocation: (val: string) => void;

  errors: Record<string, string>;
  validateField: (name: string, value: string) => void;

  isSaving: boolean;
  handleSaveService: (e: React.FormEvent) => Promise<void>;

  projects: { id: string; name: string }[];
  drivers: { id: string; name: string; phone?: string }[];
  setDrivers: React.Dispatch<React.SetStateAction<{ id: string; name: string; phone?: string }[]>>;
  vehicleTypes: string[];
  serviceTypes: string[];

  driverSearch: string;
  setDriverSearch: (val: string) => void;
  selectedDriverId: string;
  setSelectedDriverId: (val: string) => void;
  showDriverDropdown: boolean;
  setShowDriverDropdown: (val: boolean) => void;
  filteredDrivers: { id: string; name: string; phone?: string }[];
  exactMatch: { id: string; name: string; phone?: string } | undefined;
  driverRef: React.RefObject<HTMLDivElement | null>;

  showCreateDriverModal: boolean;
  setShowCreateDriverModal: (val: boolean) => void;
  newDriverPhone: string;
  setNewDriverPhone: (val: string) => void;
}

export default function useNewServiceForm(params: {
  onAddService: (newService: Service) => void;
  onNavigate: (screen: ScreenId, transition?: 'none' | 'slide_up' | 'push' | 'push_back') => void;
}): UseNewServiceFormReturn {
  const { onAddService, onNavigate } = params;
  const { showToast } = useToast();

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

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [drivers, setDrivers] = useState<{ id: string; name: string; phone?: string }[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<string[]>([]);
  const [serviceTypes, setServiceTypes] = useState<string[]>([]);

  const [driverSearch, setDriverSearch] = useState('');
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [showDriverDropdown, setShowDriverDropdown] = useState(false);
  const driverRef = useRef<HTMLDivElement>(null);

  const [showCreateDriverModal, setShowCreateDriverModal] = useState(false);
  const [newDriverPhone, setNewDriverPhone] = useState('');

  useEffect(() => {
    getProjects().then(p => { if (Array.isArray(p)) setProjects(p.map((x: any) => ({ id: x.id, name: x.name }))); }).catch(e => console.error('Failed to load projects:', e));
    getDrivers().then(d => { if (Array.isArray(d)) setDrivers(d.map((x: any) => ({ id: x.id || x.name, name: x.name, phone: x.phone }))); }).catch(e => console.error('Failed to load drivers:', e));
    getVehicleTypes().then(vt => setVehicleTypes(vt)).catch(() => {});
    getServiceTypes().then(st => setServiceTypes(st)).catch(() => {});
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (driverRef.current && !driverRef.current.contains(e.target as Node)) {
        setShowDriverDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredDrivers = driverSearch.trim()
    ? drivers.filter(d => d.name.toLowerCase().includes(driverSearch.toLowerCase()))
    : drivers;

  const exactMatch = drivers.find(d => d.name.toLowerCase() === driverSearch.toLowerCase());

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

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();

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

  return {
    company,
    setCompany,
    project,
    setProject,
    serviceDate,
    setServiceDate,
    callTime,
    setCallTime,
    serviceType,
    setServiceType,
    vehicleType,
    setVehicleType,
    vehiclePlate,
    setVehiclePlate,
    passengers,
    setPassengers,
    section,
    setSection,
    flightInfo,
    setFlightInfo,
    notes,
    setNotes,
    pickupLocation,
    setPickupLocation,
    dropoffLocation,
    setDropoffLocation,

    errors,
    validateField,

    isSaving,
    handleSaveService,

    projects,
    drivers,
    setDrivers,
    vehicleTypes,
    serviceTypes,

    driverSearch,
    setDriverSearch,
    selectedDriverId,
    setSelectedDriverId,
    showDriverDropdown,
    setShowDriverDropdown,
    filteredDrivers,
    exactMatch,
    driverRef,

    showCreateDriverModal,
    setShowCreateDriverModal,
    newDriverPhone,
    setNewDriverPhone,
  };
}
