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
    IonLoading,
    IonChip,
    IonIcon,
    IonActionSheet,
    IonBadge,
    IonFab,
    IonFabButton,
    IonRippleEffect,
    IonRefresher,
    IonRefresherContent
  } from '@ionic/react';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../utils/supabaseClient';
import { pencil, trash, add, calendarClear, time, people, location as locationIcon, create, ellipsisHorizontal } from 'ionicons/icons';

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
  expected_participants?: number; // Using the correct field name in schema
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
  const [isEditing, setIsEditing] = useState(false);
  const [currentEventId, setCurrentEventId] = useState<string | null>(null);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);

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
    
    // Then try to get the actual user
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

  const handleRefresh = (event: CustomEvent) => {
    fetchEventsForDate(selectedDate);
    event.detail.complete();
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
    setIsEditing(false);
    setCurrentEventId(null);
    setShowEventModal(true);
  };

  const openEditEventModal = (event: Event) => {
    // Populate form with event data
    setEventName(event.name);
    
    // Extract time from the date
    try {
      const eventDate = new Date(event.date);
      const hours = String(eventDate.getHours()).padStart(2, '0');
      const minutes = String(eventDate.getMinutes()).padStart(2, '0');
      setEventTime(`${hours}:${minutes}`);
    } catch (e) {
      setEventTime('');
    }
    
    setParticipants(event.expected_participants || event.participants);
    setDescription(event.description || '');
    setLocation(event.location || '');
    
    // Set editing state
    setIsEditing(true);
    setCurrentEventId(event.id);
    setShowEventModal(true);
  };

  const closeModal = () => {
    setShowEventModal(false);
  };

  const handleEventAction = (event: Event) => {
    setSelectedEvent(event);
    setShowActionSheet(true);
  };

  const handleDeleteEvent = async () => {
    if (!selectedEvent) return;
    
    setIsLoading(true);
    
    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', selectedEvent.id)
        .eq('created_by', userId); // Ensure only owner can delete
      
      if (error) {
        console.error('Error deleting event:', error);
        if (error.code === '42501' || error.message.includes('permission')) {
          setToastMessage('You do not have permission to delete this event.');
        } else {
          setToastMessage('Error deleting event. Please try again.');
        }
        setToastColor('danger');
        setShowToast(true);
      } else {
        setToastMessage('Event deleted successfully!');
        setToastColor('success');
        setShowToast(true);
        fetchEventsForDate(selectedDate);
      }
    } catch (error) {
      console.error('Error in handleDeleteEvent:', error);
      setToastMessage('An unexpected error occurred');
      setToastColor('danger');
      setShowToast(true);
    } finally {
      setShowDeleteAlert(false);
      setIsLoading(false);
    }
  };

  // Check for scheduling conflicts based on date and location
  const checkSchedulingConflict = async (eventDateTime: string, eventLocation: string, eventId?: string): Promise<boolean> => {
    if (!eventLocation) return false; // No location provided, so no conflict possible
    
    try {
      // Create date objects for start and end of day to handle timestamp comparison
      const date = new Date(eventDateTime);
      const startOfDay = new Date(date.setHours(0, 0, 0, 0)).toISOString();
      const endOfDay = new Date(date.setHours(23, 59, 59, 999)).toISOString();
      
      // Query for events on the same day at the same location
      let query = supabase
        .from('events')
        .select('id, date, location')
        .gte('date', startOfDay)
        .lte('date', endOfDay)
        .eq('location', eventLocation);
      
      // If we're editing an event, exclude the current event from the conflict check
      if (eventId) {
        query = query.neq('id', eventId);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Error checking for scheduling conflicts:', error);
        return false; // If we can't check, assume no conflict
      }
      
      // If we found any events with the same date and location, we have a conflict
      return (data && data.length > 0);
    } catch (error) {
      console.error('Exception in checkSchedulingConflict:', error);
      return false; // If we can't check, assume no conflict
    }
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
      
      // Check for scheduling conflicts
      const hasConflict = await checkSchedulingConflict(
        eventDateTime, 
        location, 
        isEditing ? currentEventId || undefined : undefined
      );
      
      if (hasConflict) {
        setToastMessage('There is already an event at this location on this day. Please choose a different location or day.');
        setToastColor('warning');
        setShowToast(true);
        setIsLoading(false);
        return;
      }
      
      // Prepare description
      let fullDescription = description || '';
      if (participants && participants > 0) {
        fullDescription += `\n\nExpected participants: ${participants}`;
      }
      
      if (isEditing && currentEventId) {
        // Update existing event
        const { data, error } = await supabase
          .from('events')
          .update({
            name: eventName,
            date: eventDateTime,
            description: fullDescription.trim(),
            expected_participants: participants || 0,
            location: location || null,
          })
          .eq('id', currentEventId)
          .eq('created_by', currentUserId) // Only owner can update
          .select();
          
        if (error) {
          console.error('Error updating event:', error);
          if (error.code === '42501' || error.message.includes('permission')) {
            setToastMessage('You do not have permission to edit this event.');
          } else {
            setToastMessage('Error updating event. Please try again.');
          }
          setToastColor('danger');
          setShowToast(true);
        } else {
          console.log('Event updated:', data);
          setToastMessage('Event updated successfully!');
          setToastColor('success');
          setShowToast(true);
          closeModal();
          fetchEventsForDate(selectedDate);
        }
      } else {
        // Create new event
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

        if (error) {
          console.error('Error creating event:', error);
          setToastMessage('Failed to create event. Please try again.');
          setToastColor('danger');
          setShowToast(true);
        } else {
          console.log('Event created:', data);
          setToastMessage('Event created successfully!');
          setToastColor('success');
          setShowToast(true);
          closeModal();
          
          // Refresh events for the selected date
          fetchEventsForDate(selectedDate);
        }
      }
    } catch (error) {
      console.error('Error in handleAddEvent:', error);
      setToastMessage('An unexpected error occurred');
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
    return event.expected_participants || event.participants;
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

  // Check if user is the creator of the event
  const isEventOwner = (event: Event): boolean => {
    return event.created_by === userId;
  };

  // Get appropriate status color
  const getStatusColor = (status?: string): string => {
    if (!status) return 'primary';
    
    switch (status) {
      case 'upcoming': return 'primary';
      case 'ongoing': return 'success';
      case 'completed': return 'medium';
      case 'cancelled': return 'danger';
      default: return 'primary';
    }
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
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent></IonRefresherContent>
        </IonRefresher>
        
        <div className="ion-padding">
          <IonCard className="ion-margin-bottom" style={{ borderRadius: '12px' }}>
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
                style={{ borderRadius: '8px', border: '1px solid #ddd' }}
              ></IonDatetime>
            </IonCardContent>
          </IonCard>

          {dateEvents.length > 0 ? (
            <div>
              <div className="ion-padding-horizontal ion-margin-bottom">
                <h2>Events on {new Date(selectedDate).toLocaleDateString()}</h2>
              </div>
              
              {dateEvents.map((event) => (
                <IonCard key={event.id} style={{ borderRadius: '12px', marginBottom: '16px' }}>
                  <IonCardHeader>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <IonCardTitle>{event.name}</IonCardTitle>
                      {isEventOwner(event) && (
                        <IonButton fill="clear" onClick={() => handleEventAction(event)}>
                          <IonIcon icon={ellipsisHorizontal} />
                        </IonButton>
                      )}
                    </div>
                    <IonBadge color={getStatusColor(event.status)} style={{ marginTop: '8px' }}>
                      {event.status?.toUpperCase() || 'UPCOMING'}
                    </IonBadge>
                  </IonCardHeader>
                  <IonCardContent>
                    <div className="ion-margin-bottom">
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                        <IonIcon icon={calendarClear} style={{ marginRight: '8px', color: '#3880ff' }} />
                        <span>{formatEventDate(event.date)}</span>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                        <IonIcon icon={time} style={{ marginRight: '8px', color: '#3880ff' }} />
                        <span>{formatEventTime(event.date)}</span>
                      </div>
                      
                      {getEventParticipants(event) !== undefined && getEventParticipants(event)! > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                          <IonIcon icon={people} style={{ marginRight: '8px', color: '#3880ff' }} />
                          <span>{getEventParticipants(event)} participants</span>
                        </div>
                      )}
                      
                      {event.location && (
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                          <IonIcon icon={locationIcon} style={{ marginRight: '8px', color: '#3880ff' }} />
                          <span>{event.location}</span>
                        </div>
                      )}
                    </div>
                    
                    {getEventDescription(event) && (
                      <div className="ion-padding" style={{ backgroundColor: '#f8f8f8', borderRadius: '8px', marginTop: '10px', marginBottom: '10px' }}>
                        <p style={{ margin: 0 }}>{getEventDescription(event)}</p>
                      </div>
                    )}
                    
                    <div className="ion-text-end ion-margin-top">
                      <IonChip color="medium" outline={true}>
                        Created by: {getSenderName(event)}
                      </IonChip>
                    </div>
                  </IonCardContent>
                </IonCard>
              ))}
            </div>
          ) : (
            <div className="ion-text-center ion-padding">
              <IonIcon icon={calendarClear} style={{ fontSize: '4rem', color: '#ccc', marginBottom: '16px' }}></IonIcon>
              <h2>No Events</h2>
              <p>There are no events scheduled for this date.</p>
            </div>
          )}
        </div>

        {/* Add Event FAB */}
        <IonFab vertical="bottom" horizontal="end" slot="fixed">
          <IonFabButton onClick={openAddEventModal}>
            <IonIcon icon={add}></IonIcon>
          </IonFabButton>
        </IonFab>

        {/* Add/Edit Event Modal */}
        <IonModal ref={modal} isOpen={showEventModal} onDidDismiss={closeModal}>
          <IonHeader>
            <IonToolbar>
              <IonTitle>{isEditing ? 'Edit Event' : 'Add New Event'}</IonTitle>
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
            
            <div className="ion-padding">
              <IonButton expand="block" onClick={handleAddEvent} className="ion-margin-bottom">
                {isEditing ? 'Update Event' : 'Save Event'}
                <IonRippleEffect></IonRippleEffect>
              </IonButton>
              
              {isEditing && (
                <IonButton expand="block" color="danger" fill="outline" onClick={() => {
                  setSelectedEvent(dateEvents.find(e => e.id === currentEventId) || null);
                  setShowDeleteAlert(true);
                  closeModal();
                }}>
                  Delete Event
                  <IonRippleEffect></IonRippleEffect>
                </IonButton>
              )}
            </div>
          </IonContent>
        </IonModal>

        {/* Action Sheet for Event Actions */}
        <IonActionSheet
          isOpen={showActionSheet}
          onDidDismiss={() => setShowActionSheet(false)}
          buttons={[
            {
              text: 'Edit',
              icon: pencil,
              handler: () => {
                if (selectedEvent) {
                  openEditEventModal(selectedEvent);
                }
              }
            },
            {
              text: 'Delete',
              role: 'destructive',
              icon: trash,
              handler: () => {
                setShowDeleteAlert(true);
              }
            },
            {
              text: 'Cancel',
              role: 'cancel'
            }
          ]}
        />

        {/* Delete Confirmation Alert */}
        <IonAlert
          isOpen={showDeleteAlert}
          onDidDismiss={() => setShowDeleteAlert(false)}
          header="Delete Event"
          message="Are you sure you want to delete this event? This action cannot be undone."
          buttons={[
            {
              text: 'Cancel',
              role: 'cancel'
            },
            {
              text: 'Delete',
              role: 'destructive',
              handler: handleDeleteEvent
            }
          ]}
        />

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
          message={isEditing ? "Updating event..." : "Creating event..."}
        />
      </IonContent>
    </IonPage>
  );
};

export default Calendar;