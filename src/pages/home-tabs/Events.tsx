import { 
    IonButtons,
    IonContent, 
    IonHeader, 
    IonMenuButton, 
    IonPage, 
    IonTitle, 
    IonToolbar,
    IonList,
    IonItem,
    IonLabel,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonChip,
    IonAvatar,
    IonText,
    IonBadge,
    IonRefresher,
    IonRefresherContent,
    IonSearchbar,
    IonIcon,
    IonSelect,
    IonSelectOption,
    IonSkeletonText,
    IonFab,
    IonFabButton,
    IonAlert,
    IonActionSheet,
    IonLoading,
    IonButton,
    IonToast,
    useIonRouter
  } from '@ionic/react';
import { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabaseClient';
import { calendar, people, time, create, location, checkmarkCircle, add, ellipsisHorizontal, pencil, trash, calendarClear } from 'ionicons/icons';

interface Event {
  id: string;
  name: string;            // Using actual DB field
  date: string;            // Timestamp with time zone
  description: string;
  created_by: string;      // UUID reference to user
  created_at: string;
  participants?: number;   // In schema2 it's "participants", in schema1 it's "expected_participants"
  location?: string;
  status?: string;
  expected_participants?: number; // Using correct field name
  profiles?: {             // For backward compatibility
    username?: string;
    full_name?: string;
    avatar_url?: string;
  };
}

const Events: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [filterBy, setFilterBy] = useState('all');
  const [userId, setUserId] = useState<string | null>(null);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastColor, setToastColor] = useState('primary');
  const navigation = useIonRouter();

  useEffect(() => {
    // Set default user ID immediately to prevent auth errors
    setUserId('00000000-0000-0000-0000-000000000000');
    
    // Initialize authentication
    initAuth();
    fetchEvents();

    // Subscribe to changes in the events table
    const subscription = supabase
      .channel('events_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'events' },
        () => {
          fetchEvents();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
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

  // Apply filtering and sorting whenever events or search/filter criteria change
  useEffect(() => {
    let filtered = [...events];
    
    // Apply search filter
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter(event => 
        event.name?.toLowerCase().includes(searchLower) ||
        event.description?.toLowerCase().includes(searchLower) ||
        event.location?.toLowerCase().includes(searchLower)
      );
    }
    
    // Apply category filter
    if (filterBy !== 'all') {
      if (filterBy === 'upcoming') {
        filtered = filtered.filter(event => 
          event.status === 'upcoming' || !event.status);
      } else if (filterBy === 'ongoing') {
        filtered = filtered.filter(event => 
          event.status === 'ongoing');
      } else if (filterBy === 'completed') {
        filtered = filtered.filter(event => 
          event.status === 'completed');
      } else if (filterBy === 'cancelled') {
        filtered = filtered.filter(event => 
          event.status === 'cancelled');
      } else if (filterBy === 'mine') {
        filtered = filtered.filter(event => 
          event.created_by === userId);
      }
    }
    
    // Sort by date
    filtered.sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    setFilteredEvents(filtered);
  }, [events, searchText, filterBy, userId]);

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*, profiles(*)')  // Include profiles for user info
        .order('date', { ascending: true });

      if (error) {
        throw error;
      }
      
      console.log('Events data:', data);
      
      setEvents(data || []);
      setFilteredEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get event organizer display name
  const getOrganizerName = (event: Event): string => {
    // If profile data exists
    if (event.profiles?.username) {
      return event.profiles.username;
    }
    
    // Fallback to UUID (first segment only)
    if (event.created_by && event.created_by.includes('-')) {
      return event.created_by.split('-')[0];
    }
    
    return 'Unknown Organizer';
  };

  // Check if user is the creator of the event
  const isEventOwner = (event: Event): boolean => {
    return event.created_by === userId;
  };

  const handleEventAction = (event: Event) => {
    setSelectedEvent(event);
    setShowActionSheet(true);
  };

  const handleEditEvent = () => {
    if (selectedEvent) {
      // Navigate to Calendar tab with event ID for editing
      navigation.push(`/rco-calendar/app/calendar?edit=${selectedEvent.id}`, 'forward');
    }
  };

  const handleDeleteEvent = async () => {
    if (!selectedEvent) return;
    
    setIsDeleting(true);
    
    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', selectedEvent.id)
        .eq('created_by', userId); // Ensure only owner can delete
      
      if (error) {
        console.error('Error deleting event:', error);
        if (error.code === '42501' || error.message.includes('permission')) {
          // TODO: Show toast message
        } else {
          // TODO: Show toast message
        }
      } else {
        // Refresh events
        fetchEvents();
      }
    } catch (error) {
      console.error('Error in handleDeleteEvent:', error);
    } finally {
      setShowDeleteAlert(false);
      setIsDeleting(false);
    }
  };

  const handleRefresh = async (event: CustomEvent) => {
    await fetchEvents();
    event.detail.complete();
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-GB', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (e) {
      return 'Invalid date';
    }
  };

  const formatTime = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return 'No time specified';
    }
  };

  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0];

  // Check if an event is happening today
  const isToday = (eventDate: string) => {
    const dateOnly = new Date(eventDate).toISOString().split('T')[0];
    return dateOnly === today;
  };

  // Status color mapping
  const getStatusColor = (status?: string): string => {
    if (!status) return 'primary'; // Default
    
    switch (status) {
      case 'upcoming': return 'primary';
      case 'ongoing': return 'success';
      case 'completed': return 'tertiary';
      case 'cancelled': return 'danger';
      default: return 'medium';
    }
  };

  // Get event participants
  const getEventParticipants = (event: Event): number | undefined => {
    return event.expected_participants || event.participants;
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

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot='start'>
            <IonMenuButton></IonMenuButton>
          </IonButtons>
          <IonTitle>All Events</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent></IonRefresherContent>
        </IonRefresher>

        <div className="ion-padding">
          <IonSearchbar
            id="events-search-bar"
            value={searchText}
            onIonChange={(e) => setSearchText(e.detail.value || '')}
            placeholder="Search events..."
            animated={true}
            style={{ borderRadius: '12px' }}
          />
          
          <IonSelect
            id="club-filter-select"
            value={filterBy}
            placeholder="Filter by status"
            onIonChange={(e) => setFilterBy(e.detail.value)}
            style={{ marginBottom: '10px', borderRadius: '8px' }}
          >
            <IonSelectOption value="all">All Events</IonSelectOption>
            <IonSelectOption value="upcoming">Upcoming</IonSelectOption>
            <IonSelectOption value="ongoing">Ongoing</IonSelectOption>
            <IonSelectOption value="completed">Completed</IonSelectOption>
            <IonSelectOption value="cancelled">Cancelled</IonSelectOption>
            <IonSelectOption value="mine">My Events</IonSelectOption>
          </IonSelect>
        </div>

        {loading ? (
          <div className="ion-padding">
            {[1, 2, 3].map((item) => (
              <IonCard key={item} style={{ borderRadius: '12px', marginBottom: '16px' }}>
                <IonCardHeader>
                  <IonSkeletonText animated style={{ width: '70%', height: '20px' }}/>
                </IonCardHeader>
                <IonCardContent>
                  <IonSkeletonText animated style={{ width: '90%', height: '15px', marginBottom: '10px' }}/>
                  <IonSkeletonText animated style={{ width: '40%', height: '15px', marginBottom: '10px' }}/>
                  <IonSkeletonText animated style={{ width: '60%', height: '15px' }}/>
                </IonCardContent>
              </IonCard>
            ))}
          </div>
        ) : filteredEvents.length === 0 ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '60%',
              flexDirection: 'column',
              padding: '20px',
              textAlign: 'center'
            }}
          >
            <IonIcon icon={calendar} style={{ fontSize: '64px', color: '#ccc', marginBottom: '10px' }} />
            <h2>No Events Found</h2>
            {searchText || filterBy !== 'all' ? (
              <p>No events match your search criteria. Try adjusting your filters.</p>
            ) : (
              <p>No events have been scheduled yet. Check back later or create your own event!</p>
            )}
          </div>
        ) : (
          <IonList id="events-list" className="ion-padding">
            {filteredEvents.map((event) => (
              <IonCard key={event.id} id={`event-card-${event.id}`} style={{ borderRadius: '12px', marginBottom: '16px' }}>
                <IonCardHeader>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <IonCardTitle>{event.name}</IonCardTitle>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      {isToday(event.date) && (
                        <IonBadge color="success" style={{ marginRight: '5px' }}>TODAY</IonBadge>
                      )}
                      <IonBadge color={getStatusColor(event.status)}>
                        {event.status?.toUpperCase() || 'UPCOMING'}
                      </IonBadge>
                      {isEventOwner(event) && (
                        <IonButton fill="clear" onClick={() => handleEventAction(event)}>
                          <IonIcon icon={ellipsisHorizontal} />
                        </IonButton>
                      )}
                    </div>
                  </div>
                  <IonChip color="primary" style={{ marginTop: '8px' }}>
                    <IonAvatar>
                      <img 
                        src={event.profiles?.avatar_url || 
                          `https://ui-avatars.com/api/?name=${encodeURIComponent(getOrganizerName(event))}&background=random`} 
                        alt="organizer" 
                      />
                    </IonAvatar>
                    <IonLabel>{getOrganizerName(event)}</IonLabel>
                  </IonChip>
                  {isEventOwner(event) && (
                    <IonChip color="secondary" outline={true} style={{ marginTop: '8px', marginLeft: '8px' }}>
                      <IonLabel>You created this</IonLabel>
                    </IonChip>
                  )}
                </IonCardHeader>
                <IonCardContent>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                    <IonIcon icon={calendar} style={{ marginRight: '8px', color: '#3880ff' }} />
                    <span>{formatDate(event.date)}</span>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                    <IonIcon icon={time} style={{ marginRight: '8px', color: '#3880ff' }} />
                    <span>{formatTime(event.date)}</span>
                  </div>
                  
                  {getEventParticipants(event) && getEventParticipants(event)! > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                      <IonIcon icon={people} style={{ marginRight: '8px', color: '#3880ff' }} />
                      <span>Expected participants: {getEventParticipants(event)}</span>
                    </div>
                  )}
                  
                  {event.location && (
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                      <IonIcon icon={location} style={{ marginRight: '8px', color: '#3880ff' }} />
                      <span>{event.location}</span>
                    </div>
                  )}
                  
                  {event.description && (
                    <div className="ion-padding" style={{ backgroundColor: '#f8f8f8', borderRadius: '8px', marginTop: '10px', marginBottom: '10px' }}>
                      <p style={{ margin: 0 }}>{event.description}</p>
                    </div>
                  )}
                  
                  <IonText color="medium">
                    <p style={{ fontSize: '0.8em', marginTop: '15px', textAlign: 'right' }}>
                      Added on {new Date(event.created_at).toLocaleDateString()}
                    </p>
                  </IonText>
                </IonCardContent>
              </IonCard>
            ))}
          </IonList>
        )}

        {/* Add Event FAB */}
        <IonFab vertical="bottom" horizontal="end" slot="fixed">
          <IonFabButton onClick={() => navigation.push('/rco-calendar/app/calendar', 'forward')}>
            <IonIcon icon={add}></IonIcon>
          </IonFabButton>
        </IonFab>

        {/* Action Sheet for Event Actions */}
        <IonActionSheet
          isOpen={showActionSheet}
          onDidDismiss={() => setShowActionSheet(false)}
          buttons={[
            {
              text: 'Edit',
              icon: pencil,
              handler: handleEditEvent
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

        {/* Loading indicator */}
        <IonLoading
          isOpen={isDeleting}
          message="Deleting event..."
        />

        <IonToast
          isOpen={showToast}
          onDidDismiss={() => setShowToast(false)}
          message={toastMessage}
          duration={2000}
          position="top"
          color={toastColor}
        />
      </IonContent>
    </IonPage>
  );
};

export default Events;