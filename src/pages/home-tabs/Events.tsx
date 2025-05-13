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
    IonCardContent
  } from '@ionic/react';
import { useState, useEffect } from 'react';

interface Event {
  id: string;
  name: string;
  date: string;
  participants: number;
  description: string;
}

const Events: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);

  useEffect(() => {
    const loadEvents = () => {
      const savedEvents = localStorage.getItem('calendarEvents');
      if (savedEvents) {
        setEvents(JSON.parse(savedEvents));
      }
    };

    loadEvents();
    // Listen for storage changes
    window.addEventListener('storage', loadEvents);
    return () => window.removeEventListener('storage', loadEvents);
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot='start'>
            <IonMenuButton></IonMenuButton>
          </IonButtons>
          <IonTitle>Upcoming Events</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        {events.length === 0 ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
            }}
          >
            No Events Listed Yet
          </div>
        ) : (
          <IonList>
            {events.map((event) => (
              <IonCard key={event.id}>
                <IonCardHeader>
                  <IonCardTitle>{event.name}</IonCardTitle>
                </IonCardHeader>
                <IonCardContent>
                  <p><strong>Date:</strong> {formatDate(event.date)}</p>
                  <p><strong>Expected Participants:</strong> {event.participants}</p>
                  <p><strong>Description:</strong> {event.description}</p>
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