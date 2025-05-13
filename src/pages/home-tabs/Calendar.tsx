import { 
    IonAlert,
    IonButton,
    IonButtons,
    IonContent, 
    IonDatetime, 
    IonHeader, 
    IonMenuButton, 
    IonPage, 
    IonTitle, 
    IonToolbar,
    IonToast,
    IonModal,
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonCardTitle,
    IonInput,
    IonTextarea,
    IonLabel,
    IonItem,
    IonList,
    IonText,
    IonLoading
  } from '@ionic/react';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../utils/supabaseClient';

interface Event {
  id: string;
  name: string;           // Using existing schema field names
  date: string;           // This is actually a timestamp with time zone
  participants?: number;  // In schema2 it's "participants", in schema1 it's "expected_participants"
  description: string;
  created_by: string;     // This is a UUID reference to auth.users or profiles
  created_at: string;
  location?: string;      // Added from schema
  status?: string;        // Added from schema
}

const Calendar: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString());
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastColor, setToastColor] = useState('primary');
  
  // New event form state
  const [showEventModal, setShowEventModal] = useState(false);
  const [eventName, setEventName] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [participants, setParticipants] = useState<number | undefined>();
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Club events for the selected date
  const [dateEvents, setDateEvents] = useState<Event[]>([]);
  // Current user ID
  const [userId, setUserId] = useState<string | null>(null);

  // Modal reference
  const modal = useRef<HTMLIonModalElement>(null);

  // Debug function to check table structure on component mount
  useEffect(() => {
    // Set default user ID immediately to prevent auth errors
    setUserId('00000000-0000-0000-0000-000000000000');
    
    // Initialize authentication
    initAuth();
    checkTableStructure();
  }, []);

  // Initialize authentication
  const initAuth = async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      
      // If session exists, update userId
      if (sessionData.session) {
        setUserId(sessionData.session.user.id);
      } else {
        console.log('No active session found');
        // Already set a default ID in useEffect
      }
    } catch (e) {
      console.error('Error initializing auth:', e);
    }
  };

  const getCurrentUser = async () => {
    try {
      // Try to get user info from supabase auth
      const { data: userData } = await supabase.auth.getUser();
      
      if (userData.user) {
        console.log('Current user:', userData.user);
        setUserId(userData.user.id);
      } else {
        console.log('No authenticated user found');
        // Already set a default ID in useEffect
      }
    } catch (e) {
      console.error('Error in getCurrentUser:', e);
      // Already set a default ID in useEffect
    }
  };

  const checkTableStructure = async () => {
    try {
      // First, let's try to get the first record just to see the structure
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .limit(1);
      
      if (error) {
        console.error('Error fetching sample event:', error);
        return;
      }
      
      console.log('Sample event structure:', data);
      
      // Now let's try to check if there are any events at all
      const { count, error: countError } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true });
        
      if (countError) {
        console.error('Error counting events:', countError);
        return;
      }
      
      console.log('Number of events in database:', count);
    } catch (e) {
      console.error('Error checking table structure:', e);
    }
  };

  // Fetch events for the selected date
  useEffect(() => {
    if (selectedDate) {
      fetchEventsForDate(selectedDate);
    }
  }, [selectedDate]);

  const fetchEventsForDate = async (dateStr: string) => {
    try {
      // Create date objects for start and end of day to handle timestamp comparison
      const date = new Date(dateStr);
      const startOfDay = new Date(date.setHours(0, 0, 0, 0)).toISOString();
      const endOfDay = new Date(date.setHours(23, 59, 59, 999)).toISOString();
      
      console.log('Fetching events between:', startOfDay, 'and', endOfDay);
      
      // First test read permissions
      console.log('Testing read permissions with current user ID:', userId);
      const { count, error: countError } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true });
        
      if (countError) {
        console.error('Error counting events (permission test):', countError);
        // This might be an RLS permission issue
        setDateEvents([]);
        return;
      }
      
      console.log('Number of events in database:', count);
      
      // Now perform the actual query
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .gte('date', startOfDay)  // Greater than or equal to start of day
        .lte('date', endOfDay);   // Less than or equal to end of day

      if (error) {
        console.error('Error fetching events for date:', error);
        setDateEvents([]);
        return;
      }
      
      console.log('Events found:', data);
      setDateEvents(data || []);
    } catch (error) {
      console.error('Exception in fetchEventsForDate:', error);
      setDateEvents([]);
    }
  };

  const handleDateChange = (e: CustomEvent) => {
    setSelectedDate(e.detail.value);
  };

  const openAddEventModal = () => {
    // Reset form fields
    setEventName('');
    setEventTime('');
    setParticipants(undefined);
    setDescription('');
    setLocation('');
    setShowEventModal(true);
  };

  const closeModal = () => {
    setShowEventModal(false);
  };

  const handleAddEvent = async () => {
    if (!eventName || !selectedDate) {
      setToastMessage('Please fill in all required fields');
      setToastColor('danger');
      setShowToast(true);
      return;
    }

    setIsLoading(true);

    try {
      // Debugging: Log current user ID
      console.log('Current userId before event creation:', userId);

      // Get current session
      const { data: sessionData } = await supabase.auth.getSession();
      console.log('Session data:', sessionData);
      
      // If no session exists, use the default user ID
      const currentUserId = sessionData.session?.user?.id || userId;
      console.log('Using user ID for event creation:', currentUserId);
      
      if (!currentUserId) {
        setToastMessage('Authentication error. Cannot create event.');
        setToastColor('danger');
        setShowToast(true);
        setIsLoading(false);
        return;
      }

      // Debug: Check if user has a profile first
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, username')
        .eq('id', currentUserId)
        .single();
        
      console.log('Profile check result:', profileData, profileError);

      if (profileError || !profileData) {
        console.log('Creating new profile for user:', currentUserId);
        
        // Create a profile for this user - needed for foreign key constraint
        const { error: insertError } = await supabase
          .from('profiles')
          .insert([{ 
            id: currentUserId,
            username: sessionData.session?.user?.email?.split('@')[0] || 'user',
            full_name: 'New User'
          }]);
          
        if (insertError) {
          console.error('Error creating profile:', insertError);
          setToastMessage('Failed to create user profile. Please try again.');
          setToastColor('danger');
          setShowToast(true);
          setIsLoading(false);
          return;
        }
        
        // Wait a moment for the insert to complete
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Format the datetime with the time component
      let eventDateTime: string;

      if (eventTime) {
        // If time is provided, use it
        const date = new Date(selectedDate);
        const [hours, minutes] = eventTime.split(':').map(Number);
        date.setHours(hours, minutes, 0, 0);
        eventDateTime = date.toISOString();
      } else {
        // If no time provided, use noon as default
        const date = new Date(selectedDate);
        date.setHours(12, 0, 0, 0);
        eventDateTime = date.toISOString();
      }
      
      // Prepare description
      let fullDescription = description || '';
      if (participants && participants > 0) {
        fullDescription += `\n\nExpected participants: ${participants}`;
      }
      
      // Create event object using the schema fields
      const newEvent = {
        name: eventName,
        date: eventDateTime,          // Full timestamp
        description: fullDescription.trim(),
        created_by: currentUserId,    // Use the current user ID
        expected_participants: participants || 0,  // Using the correct schema field name
        location: location || null,
        status: 'upcoming'            // Default status from schema
      };

      // Log the data being sent to the server for debugging
      console.log('Sending event data:', newEvent);

      // Test basic insert permission first
      const { data: testData, error: testError } = await supabase
        .from('events')
        .insert([{ 
          name: 'Test Permission',
          date: new Date().toISOString(),
          description: 'Testing permissions',
          created_by: currentUserId,
          expected_participants: 0
        }])
        .select();
        
      if (testError) {
        console.error('Permission test error:', testError);
        // Check if this is an RLS policy error
        if (testError.message.includes('policy') || testError.code === '42501') {
          setToastMessage('Permission denied: You do not have access to create events. Please contact administrator.');
        } else {
          setToastMessage(`Error: ${testError.message}`);
        }
        setToastColor('danger');
        setShowToast(true);
        setIsLoading(false);
        return;
      } else {
        console.log('Permission test successful:', testData);
        // Delete test event
        if (testData && testData.length > 0) {
          await supabase.from('events').delete().eq('id', testData[0].id);
        }
      }

      // Now try to create the actual event
      const { data, error } = await supabase
        .from('events')
        .insert([newEvent])
        .select();

      if (error) throw error;

      console.log('Event created:', data);

      // Refresh events for the selected date
      fetchEventsForDate(selectedDate);
      
      setToastMessage('Event created successfully!');
      setToastColor('success');
      setShowToast(true);
      closeModal();
    } catch (error) {
      console.error('Error creating event:', error);
      setToastMessage('Failed to create event. Please try again.');
      setToastColor('danger');
      setShowToast(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Format date for display
  const formatEventDate = (dateTimeStr: string): string => {
    try {
      return new Date(dateTimeStr).toLocaleDateString();
    } catch (e) {
      return 'Invalid date';
    }
  };

  // Extract time from timestamp
  const formatEventTime = (dateTimeStr: string): string => {
    try {
      return new Date(dateTimeStr).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return 'No time specified';
    }
  };

  // Extract participants from event
  const getEventParticipants = (event: Event): number | undefined => {
    return event.participants;
  };

  // Get event description
  const getEventDescription = (event: Event): string => {
    return event.description || '';
  };

  // Get sender name for display
  const getSenderName = (event: Event): string => {
    // Protect against undefined created_by
    if (!event.created_by) return 'Unknown';
    
    // If it's a UUID, just show first 8 chars
    if (event.created_by.includes('-')) {
      return event.created_by.split('-')[0];
    }
    
    return event.created_by;
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot='start'>
            <IonMenuButton></IonMenuButton>
          </IonButtons>
          <IonTitle>Club Calendar</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '20px',
          }}
        >
          <IonCard style={{ width: '100%', maxWidth: '500px' }}>
            <IonCardHeader>
              <IonCardTitle>Select a Date</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <IonDatetime 
                id="event-date-picker"
                presentation="date"
                locale="en-GB"
                value={selectedDate}
                onIonChange={handleDateChange}
              ></IonDatetime>
              <IonButton expand="full" onClick={openAddEventModal}>
                Add an event on this day
              </IonButton>
            </IonCardContent>
          </IonCard>

          {dateEvents.length > 0 && (
            <IonCard style={{ width: '100%', maxWidth: '500px', marginTop: '20px' }}>
              <IonCardHeader>
                <IonCardTitle>
                  Events on {new Date(selectedDate).toLocaleDateString()}
                </IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                <IonList>
                  {dateEvents.map((event) => (
                    <IonItem key={event.id}>
                      <div style={{ width: '100%' }}>
                        <IonLabel>
                          <h2>{event.name}</h2>
                          <p><strong>Time:</strong> {formatEventTime(event.date)}</p>
                          {getEventParticipants(event) !== undefined && getEventParticipants(event)! > 0 && (
                            <p><strong>Participants:</strong> {getEventParticipants(event)}</p>
                          )}
                          {event.location && (
                            <p><strong>Location:</strong> {event.location}</p>
                          )}
                          <p><strong>Status:</strong> {event.status || 'upcoming'}</p>
                          <p>{getEventDescription(event)}</p>
                        </IonLabel>
                      </div>
                    </IonItem>
                  ))}
                </IonList>
              </IonCardContent>
            </IonCard>
          )}
        </div>

        {/* Add Event Modal */}
        <IonModal ref={modal} isOpen={showEventModal} onDidDismiss={closeModal}>
          <IonHeader>
            <IonToolbar>
              <IonTitle>Add New Event</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={closeModal}>Cancel</IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            <IonList>
              <IonItem>
                <IonInput
                  id="event-name-input"
                  name="event-name"
                  label="Event Name"
                  labelPlacement="stacked"
                  placeholder="Enter event name"
                  value={eventName}
                  onIonChange={e => setEventName(e.detail.value || '')}
                  required
                ></IonInput>
              </IonItem>
              
              <IonItem>
                <IonText>Date: {new Date(selectedDate).toLocaleDateString()}</IonText>
              </IonItem>
              
              <IonItem>
                <IonInput
                  id="event-time-input"
                  name="event-time"
                  label="Event Time"
                  labelPlacement="stacked"
                  type="time"
                  value={eventTime}
                  onIonChange={e => setEventTime(e.detail.value || '')}
                ></IonInput>
              </IonItem>
              
              <IonItem>
                <IonInput
                  id="event-participants-input"
                  name="event-participants"
                  label="Expected Participants"
                  labelPlacement="stacked"
                  type="number"
                  placeholder="Number of participants"
                  value={participants}
                  onIonChange={e => setParticipants(e.detail.value ? parseInt(e.detail.value) : undefined)}
                ></IonInput>
              </IonItem>
              
              <IonItem>
                <IonInput
                  id="event-location-input"
                  name="event-location"
                  label="Location"
                  labelPlacement="stacked"
                  placeholder="Event location"
                  value={location}
                  onIonChange={e => setLocation(e.detail.value || '')}
                ></IonInput>
              </IonItem>
              
              <IonItem>
                <IonTextarea
                  id="event-description-input"
                  name="event-description"
                  label="Description"
                  labelPlacement="stacked"
                  placeholder="Event description"
                  value={description}
                  onIonChange={e => setDescription(e.detail.value || '')}
                  rows={4}
                ></IonTextarea>
              </IonItem>
            </IonList>
            
            <div style={{ padding: '20px' }}>
              <IonButton expand="block" onClick={handleAddEvent}>
                Save Event
              </IonButton>
            </div>
          </IonContent>
        </IonModal>

        <IonToast
          isOpen={showToast}
          onDidDismiss={() => setShowToast(false)}
          message={toastMessage}
          duration={2000}
          position="top"
          color={toastColor}
        />

        <IonLoading
          isOpen={isLoading}
          message="Creating event..."
        />
      </IonContent>
    </IonPage>
  );
};

export default Calendar;