import { 
  IonButton,
  IonButtons,
  IonContent, 
  IonHeader, 
  IonIcon, 
  IonLabel, 
  IonMenuButton, 
  IonPage, 
  IonRouterOutlet, 
  IonTabBar, 
  IonTabButton, 
  IonTabs, 
  IonTitle, 
  IonToolbar 
} from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { calendarOutline, listOutline } from 'ionicons/icons';
import { Route, Redirect } from 'react-router-dom';

import Events from './home-tabs/Events';
import Calendar from './home-tabs/Calendar';
  
const Home: React.FC = () => {
  const tabs = [
    {
      name: 'Events',
      tab: 'events',
      url: '/rco-calendar/app/home/events',
      icon: listOutline
    },
    {
      name: 'Calendar',
      tab: 'calendar',
      url: '/rco-calendar/app/home/calendar',
      icon: calendarOutline
    }
  ];
    
  return (
    <IonReactRouter>
      <IonTabs>
        <IonRouterOutlet>
          <Route exact path="/rco-calendar/app/home/calendar">
            <Calendar />
          </Route>
          <Route exact path="/rco-calendar/app/home/events">
            <Events />
          </Route>
          <Route exact path="/rco-calendar/app/home">
            <Redirect to="/rco-calendar/app/home/calendar" />
          </Route>
        </IonRouterOutlet>

        <IonTabBar slot="bottom">
          {tabs.map((item, index) => (
            <IonTabButton key={index} tab={item.tab} href={item.url}>
              <IonIcon icon={item.icon} />
              <IonLabel>{item.name}</IonLabel>
            </IonTabButton>
          ))}
        </IonTabBar>
      </IonTabs>
    </IonReactRouter>
  );
};
  
export default Home;