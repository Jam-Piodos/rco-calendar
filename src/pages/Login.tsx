import { 
  IonAlert,
  IonAvatar,
  IonButton,
  IonContent, 
  IonIcon, 
  IonInput, 
  IonInputPasswordToggle,  
  IonPage,  
  IonToast,  
  useIonRouter,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonText,
  IonLoading,
} from '@ionic/react';
import { peopleCircleOutline } from 'ionicons/icons';
import { useState } from 'react';
import { supabase } from '../utils/supabaseClient';

const AlertBox: React.FC<{ message: string; isOpen: boolean; onClose: () => void }> = ({ message, isOpen, onClose }) => {
  return (
    <IonAlert
      isOpen={isOpen}
      onDidDismiss={onClose}
      header="Notification"
      message={message}
      buttons={['OK']}
    />
  );
};

const Login: React.FC = () => {
  const navigation = useIonRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [showAlert, setShowAlert] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [loading, setLoading] = useState(false);

  const doLogin = async () => {
    if (!email || !password) {
      setAlertMessage('Please fill in all fields');
      setShowAlert(true);
      return;
    }

    setLoading(true);

    try {
      // First sign in with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (authError) {
        // If auth fails, try the custom club login as a fallback
        const { data: clubData, error: clubError } = await supabase
          .from('clubs')
          .select('club_name, club_id, leader_password')
          .eq('leader_email', email)
          .single();

        if (clubError || !clubData) {
          setAlertMessage('No account found with this email or password is incorrect.');
          setShowAlert(true);
          setLoading(false);
          return;
        }

        // Verify password for club
        if (clubData.leader_password !== password) {
          setAlertMessage('Invalid password.');
          setShowAlert(true);
          setLoading(false);
          return;
        }

        // For clubs, we also need to create a Supabase auth user if it doesn't exist
        // Try to sign up the user with Supabase Auth
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              club_id: clubData.club_id,
              club_name: clubData.club_name
            }
          }
        });

        if (signUpError && !signUpError.message.includes('already registered')) {
          console.error('Error creating auth user:', signUpError);
          // Continue anyway as we have club authentication
        }

        // Store club info in session
        sessionStorage.setItem('clubName', clubData.club_name);
        sessionStorage.setItem('clubEmail', email);
        sessionStorage.setItem('clubId', clubData.club_id);
      } else {
        // Supabase Auth login successful
        console.log('Auth login successful:', authData);
        
        // Check if this user is associated with a club
        const { data: clubData, error: clubError } = await supabase
          .from('clubs')
          .select('club_name, club_id')
          .eq('leader_email', email)
          .single();
          
        if (!clubError && clubData) {
          // Store club info in session
          sessionStorage.setItem('clubName', clubData.club_name);
          sessionStorage.setItem('clubEmail', email);
          sessionStorage.setItem('clubId', clubData.club_id);
        }
      }

      // Success - show toast and redirect
      setShowToast(true);
      setTimeout(() => {
        navigation.push('/rco-calendar/app', 'forward', 'replace');
      }, 300);
    } catch (error) {
      console.error('Login error:', error);
      setAlertMessage('An unexpected error occurred');
      setShowAlert(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <IonPage>
      <IonContent>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px' }}>
          <IonCard>
            <IonCardHeader style={{ textAlign: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
                <IonAvatar style={{ width: '100px', height: '100px' }}>
                  <IonIcon src={peopleCircleOutline} style={{ width: '100%', height: '100%', padding: '15px' }}></IonIcon>
                </IonAvatar>
              </div>
              <IonCardTitle>Welcome Back!</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <IonInput
                id="login-email"
                name="login-email"
                type="email"
                labelPlacement="floating"
                label="Email"
                placeholder="Enter email"
                className="custom-input"
                value={email}
                onIonInput={(e) => setEmail(e.detail.value!)}
              ></IonInput>
              <div style={{ height: '15px' }}></div>
              <IonInput
                id="login-password"
                name="login-password"
                type="password"
                labelPlacement="floating"
                label="Password"
                placeholder="Enter password"
                className="custom-input"
                value={password}
                onIonInput={(e) => setPassword(e.detail.value!)}
              >
                <IonInputPasswordToggle slot="end" />
              </IonInput>
              <br />
              <IonButton expand="block" onClick={doLogin}>
                Login
              </IonButton>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '20px' }}>
                <IonText>Don't have an account?</IonText>
                <IonButton fill="clear" routerLink="/rco-calendar/register">
                  Register
                </IonButton>
              </div>
            </IonCardContent>
          </IonCard>
        </div>
      </IonContent>
      
      <AlertBox message={alertMessage} isOpen={showAlert} onClose={() => setShowAlert(false)} />
      
      <IonToast
        isOpen={showToast}
        onDidDismiss={() => setShowToast(false)}
        message="Login successful!"
        duration={2000}
        position="top"
        color="success"
      />
      
      <IonLoading
        isOpen={loading}
        message="Logging in..."
      />
    </IonPage>
  );
};

export default Login;
