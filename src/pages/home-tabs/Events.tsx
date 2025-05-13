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
    IonSkeletonText
  } from '@ionic/react';
import { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabaseClient';
import { calendar, people, time, create, location, checkmarkCircle } from 'ionicons/icons';

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

  useEffect(() => {
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
      }
    }
    
    // Sort by date
    filtered.sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    setFilteredEvents(filtered);
  }, [events, searchText, filterBy]);

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
          />
          
          <IonSelect
            id="club-filter-select"
            value={filterBy}
            placeholder="Filter by status"
            onIonChange={(e) => setFilterBy(e.detail.value)}
            style={{ marginBottom: '10px' }}
          >
            <IonSelectOption value="all">All Events</IonSelectOption>
            <IonSelectOption value="upcoming">Upcoming</IonSelectOption>
            <IonSelectOption value="ongoing">Ongoing</IonSelectOption>
            <IonSelectOption value="completed">Completed</IonSelectOption>
            <IonSelectOption value="cancelled">Cancelled</IonSelectOption>
          </IonSelect>
        </div>

        {loading ? (
          <div className="ion-padding">
            {[1, 2, 3].map((item) => (
              <IonCard key={item}>
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
          <IonList id="events-list">
            {filteredEvents.map((event) => (
              <IonCard key={event.id} id={`event-card-${event.id}`}>
                <IonCardHeader>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <IonCardTitle>{event.name}</IonCardTitle>
                    <div>
                      {isToday(event.date) && (
                        <IonBadge color="success" style={{ marginRight: '5px' }}>TODAY</IonBadge>
                      )}
                      <IonBadge color={getStatusColor(event.status)}>
                        {event.status || 'UPCOMING'}
                      </IonBadge>
                    </div>
                  </div>
                  <IonChip color="primary">
                    <IonAvatar>
                      <img 
                        src={event.profiles?.avatar_url || 
                          `https://ui-avatars.com/api/?name=${encodeURIComponent(getOrganizerName(event))}&background=random`} 
                        alt="organizer" 
                      />
                    </IonAvatar>
                    <IonLabel>{getOrganizerName(event)}</IonLabel>
                  </IonChip>
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
                  
                  {event.participants && event.participants > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                      <IonIcon icon={people} style={{ marginRight: '8px', color: '#3880ff' }} />
                      <span>Expected participants: {event.participants}</span>
                    </div>
                  )}
                  
                  {event.location && (
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                      <IonIcon icon={location} style={{ marginRight: '8px', color: '#3880ff' }} />
                      <span>{event.location}</span>
                    </div>
                  )}
                  
                  {event.description && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '8px', marginTop: '10px' }}>
                      <IonIcon icon={create} style={{ marginRight: '8px', marginTop: '4px', color: '#3880ff' }} />
                      <span>{event.description}</span>
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
      </IonContent>
    </IonPage>
  );
};

export default Events;