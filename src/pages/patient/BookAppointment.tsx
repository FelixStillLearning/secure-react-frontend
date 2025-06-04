import React, { useState, useEffect, useCallback } from 'react';
import { 
  Calendar, 
  User, 
  Search, 
  Star,
  MapPin,
  Phone,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { auditLogger } from '../../utils/security';
import { apiClient } from '../../api/axios.config';
import { Doctor, Specialization } from '../../types/auth.types';

interface TimeSlot {
  time: string;
  available: boolean;
  appointmentId?: string;
}

interface DaySchedule {
  date: string;
  slots: TimeSlot[];
}

const BookAppointment: React.FC = () => {
  const { user } = useAuth();
  const [specializations, setSpecializations] = useState<Specialization[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [filteredDoctors, setFilteredDoctors] = useState<Doctor[]>([]);
  const [selectedSpecialization, setSelectedSpecialization] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [availableSlots, setAvailableSlots] = useState<DaySchedule[]>([]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);  const [currentWeek, setCurrentWeek] = useState(new Date());

  const loadSpecializations = async () => {
    try {
      const response = await apiClient.get('/specializations');
      setSpecializations(response.data);
    } catch (err) {
      console.error('Failed to load specializations:', err);
    }
  };

  const loadDoctors = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/doctors');
      setDoctors(response.data);
    } catch (err) {
      setError('Failed to load doctors');
    } finally {
      setLoading(false);
    }
  };

  const filterDoctors = useCallback(() => {
    let filtered = doctors;

    if (selectedSpecialization) {
      filtered = filtered.filter(doctor => {
        if (typeof doctor.specialization === 'object') {
          return doctor.specialization?.id === selectedSpecialization;
        }
        return doctor.specialization === selectedSpecialization;
      });
    }

    if (searchTerm) {
      filtered = filtered.filter(doctor => {
        const doctorName = doctor.user?.name || doctor.name || '';
        const specializationName = typeof doctor.specialization === 'object' 
          ? doctor.specialization?.name || ''
          : doctor.specialization || '';
        
        return doctorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
               specializationName.toLowerCase().includes(searchTerm.toLowerCase());
      });
    }

    setFilteredDoctors(filtered);
  }, [doctors, selectedSpecialization, searchTerm]);

  const loadAvailableSlots = useCallback(async () => {
    if (!selectedDoctor) return;

    try {
      const startDate = getWeekStart(currentWeek);
      const endDate = getWeekEnd(currentWeek);
      
      const response = await apiClient.get(`/doctors/${selectedDoctor.id}/availability`, {
        params: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        }
      });
      setAvailableSlots(response.data);
    } catch (err) {
      console.error('Failed to load available slots:', err);
    }
  }, [selectedDoctor, currentWeek]);

  useEffect(() => {
    loadSpecializations();
    loadDoctors();
  }, []);

  useEffect(() => {
    filterDoctors();
  }, [filterDoctors]);

  useEffect(() => {
    if (selectedDoctor) {
      loadAvailableSlots();
    }
  }, [selectedDoctor, loadAvailableSlots]);

  const getWeekStart = (date: Date) => {
    const start = new Date(date);
    start.setDate(start.getDate() - start.getDay());
    start.setHours(0, 0, 0, 0);
    return start;
  };

  const getWeekEnd = (date: Date) => {
    const end = new Date(date);
    end.setDate(end.getDate() - end.getDay() + 6);
    end.setHours(23, 59, 59, 999);
    return end;
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newWeek = new Date(currentWeek);
    newWeek.setDate(newWeek.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentWeek(newWeek);
    setSelectedDate('');
    setSelectedTime('');
  };
  const handleBooking = async () => {
    if (!selectedDoctor || !selectedDate || !selectedTime) {
      setError('Please select a doctor, date, and time');
      return;
    }

    try {
      setBookingLoading(true);
      setError(null);

      // Create appointment date
      const appointmentDate = new Date(`${selectedDate}T${selectedTime}`);

      const appointmentData = {
        doctorId: selectedDoctor.id,
        appointmentDate: appointmentDate.toISOString(),
        notes: notes,
        status: 'pending'
      };

      await apiClient.post('/appointments', appointmentData);      // Log successful booking
      auditLogger.log(
        'appointment_booked',
        true,
        `Appointment booked with Dr. ${selectedDoctor.user?.name || selectedDoctor.name}`,
        user?.id
      );

      setSuccess('Appointment booked successfully! You will receive a confirmation email shortly.');
      
      // Reset form
      setSelectedDoctor(null);
      setSelectedDate('');
      setSelectedTime('');
      setNotes('');
      
      // Reload available slots
      loadAvailableSlots();    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to book appointment';
      setError(errorMessage);
      
      auditLogger.log(
        'appointment_booking_failed',
        false,
        `Appointment booking failed: ${errorMessage}`,
        user?.id
      );
    } finally {
      setBookingLoading(false);
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${
          i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
        }`}
      />
    ));
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const isDateDisabled = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Book an Appointment</h1>
          <p className="text-gray-600 mt-2">Find and schedule with the right doctor for you</p>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
              <p className="text-green-800">{success}</p>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-600 mr-3" />
              <p className="text-red-800">{error}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Doctor Selection */}
          <div className="lg:col-span-2 space-y-6">
            {/* Filters */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Find a Doctor</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Specialization
                  </label>
                  <select
                    value={selectedSpecialization}
                    onChange={(e) => setSelectedSpecialization(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">All Specializations</option>
                    {specializations.map((spec) => (
                      <option key={spec.id} value={spec.id}>
                        {spec.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Search
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search by doctor name..."
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Doctor List */}
            <div className="space-y-4">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Loading doctors...</p>
                </div>
              ) : filteredDoctors.length === 0 ? (
                <div className="text-center py-8">
                  <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No doctors found</p>
                </div>
              ) : (
                filteredDoctors.map((doctor) => (
                  <div
                    key={doctor.id}
                    className={`bg-white rounded-lg shadow-sm border p-6 cursor-pointer transition-all ${
                      selectedDoctor?.id === doctor.id
                        ? 'border-blue-500 ring-2 ring-blue-200'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                    onClick={() => setSelectedDoctor(doctor)}
                  >
                    <div className="flex items-start space-x-4">
                      <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="w-8 h-8 text-blue-600" />
                      </div>
                      <div className="flex-1">                        <h3 className="text-lg font-semibold text-gray-900">
                          Dr. {doctor.user?.name || doctor.name}
                        </h3><p className="text-blue-600 font-medium">
                          {typeof doctor.specialization === 'object' 
                            ? doctor.specialization?.name 
                            : doctor.specialization}
                        </p>
                        <div className="flex items-center mt-2">
                          {renderStars(doctor.averageRating || 0)}
                          <span className="ml-2 text-sm text-gray-600">
                            ({doctor.totalReviews || 0} reviews)
                          </span>
                        </div>
                        <div className="mt-3 space-y-1">
                          <div className="flex items-center text-sm text-gray-600">
                            <MapPin className="w-4 h-4 mr-2" />
                            {doctor.hospitalName || 'Medical Center'}
                          </div>
                          <div className="flex items-center text-sm text-gray-600">
                            <Phone className="w-4 h-4 mr-2" />
                            {doctor.phoneNumber || 'Contact via appointment'}
                          </div>
                        </div>
                        {doctor.bio && (
                          <p className="mt-3 text-sm text-gray-600">{doctor.bio}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Appointment Scheduling */}
          <div className="space-y-6">
            {selectedDoctor ? (
              <>
                {/* Selected Doctor */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Selected Doctor</h2>
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>                      <h3 className="font-medium text-gray-900">
                        Dr. {selectedDoctor.user?.name || selectedDoctor.name}
                      </h3>
                      <p className="text-sm text-blue-600">
                        {typeof selectedDoctor.specialization === 'object' 
                          ? selectedDoctor.specialization?.name 
                          : selectedDoctor.specialization}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Calendar */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">Select Date & Time</h2>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => navigateWeek('prev')}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <span className="text-sm font-medium">
                        {formatDate(getWeekStart(currentWeek).toISOString())} - {formatDate(getWeekEnd(currentWeek).toISOString())}
                      </span>
                      <button
                        onClick={() => navigateWeek('next')}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {availableSlots.map((day) => (
                      <div key={day.date}>
                        <h3 className="font-medium text-gray-900 mb-2">
                          {formatDate(day.date)}
                        </h3>
                        <div className="grid grid-cols-3 gap-2">
                          {day.slots.map((slot) => (
                            <button
                              key={slot.time}
                              disabled={!slot.available || isDateDisabled(day.date)}
                              onClick={() => {
                                setSelectedDate(day.date);
                                setSelectedTime(slot.time);
                              }}
                              className={`p-2 text-sm rounded-lg border transition-colors ${
                                selectedDate === day.date && selectedTime === slot.time
                                  ? 'bg-blue-600 text-white border-blue-600'
                                  : slot.available && !isDateDisabled(day.date)
                                  ? 'bg-white text-gray-900 border-gray-300 hover:border-blue-500'
                                  : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                              }`}
                            >
                              {slot.time}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Additional Notes (Optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    maxLength={500}
                    placeholder="Describe your symptoms or reason for visit..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {notes.length}/500 characters
                  </p>
                </div>

                {/* Book Button */}
                <button
                  onClick={handleBooking}
                  disabled={!selectedDate || !selectedTime || bookingLoading}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {bookingLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Booking...
                    </div>
                  ) : (
                    'Book Appointment'
                  )}
                </button>
              </>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
                <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Select a doctor to view available times</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookAppointment;
