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
  
  const Search: React.FC = () => {
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
            <IonDatetime locale="en-GB-u-hc-h12"></IonDatetime>
            <IonButton expand="full" id='add-event'>Add an event on this day</IonButton>
            </div>
          </div>
  
          <IonAlert
          trigger="add-event"
          header="Please fill this infos"
          buttons={['ADD EVENT']}
          inputs={[
            {
              placeholder: 'Event Name',
            },
            {
              type: 'number',
              placeholder: 'Number of Expected Participants',
              min: 1,
              max: 100,
            },
            {
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