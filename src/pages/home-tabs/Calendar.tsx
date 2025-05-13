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
    IonToolbar 
  } from '@ionic/react';
import { useState } from 'react';

interface Event {
  id: string;
  name: string;
  date: string;
  participants: number;
  description: string;
}

const Calendar: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [events, setEvents] = useState<Event[]>(() => {
    const savedEvents = localStorage.getItem('calendarEvents');
    return savedEvents ? JSON.parse(savedEvents) : [];
  });

  const handleDateChange = (e: CustomEvent) => {
    setSelectedDate(e.detail.value);
  };

  const handleAddEvent = (e: CustomEvent) => {
    const { name, participants, description } = e.detail.data;
    if (!name || !selectedDate) return;

    const newEvent: Event = {
      id: Date.now().toString(),
      name,
      date: selectedDate,
      participants: parseInt(participants) || 0,
      description
    };

    const updatedEvents = [...events, newEvent];
    setEvents(updatedEvents);
    localStorage.setItem('calendarEvents', JSON.stringify(updatedEvents));
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot='start'>
            <IonMenuButton></IonMenuButton>
          </IonButtons>
          <IonTitle>Calendar</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
          }}
        >
          <div>
            <IonDatetime 
              locale="en-GB-u-hc-h12"
              onIonChange={handleDateChange}
            ></IonDatetime>
            <IonButton expand="full" id='add-event'>Add an event on this day</IonButton>
          </div>
        </div>

        <IonAlert
          trigger="add-event"
          header="Please fill this info"
          buttons={[
            {
              text: 'Cancel',
              role: 'cancel'
            },
            {
              text: 'Add Event',
              handler: handleAddEvent
            }
          ]}
          inputs={[
            {
              name: 'name',
              placeholder: 'Event Name'
            },
            {
              name: 'participants',
              type: 'number',
              placeholder: 'Number of Expected Participants',
              min: 1,
              max: 100,
            },
            {
              name: 'description',
              type: 'textarea',
              placeholder: 'Short Description',
            },
          ]}
        ></IonAlert>
      </IonContent>
    </IonPage>
  );
};

export default Calendar;