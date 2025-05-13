import React, { useState } from 'react';
import {
    IonButton,
    IonContent,
    IonInput,
    IonInputPasswordToggle,
    IonPage,
    IonTitle,
    IonModal,
    IonText,
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonCardSubtitle,
    IonCardTitle,
    IonAlert,
    IonSelect,
    IonSelectOption,
    IonTextarea,
    IonLoading,
    useIonRouter,
} from '@ionic/react';
import { supabase } from '../utils/supabaseClient';

// Reusable Alert Component
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

const Register: React.FC = () => {
    const [clubName, setClubName] = useState('');
    const [clubDescription, setClubDescription] = useState('');
    const [clubCategory, setClubCategory] = useState('');
    const [leaderName, setLeaderName] = useState('');
    const [leaderEmail, setLeaderEmail] = useState('');
    const [leaderPosition, setLeaderPosition] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [alertMessage, setAlertMessage] = useState('');
    const [showAlert, setShowAlert] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const navigation = useIonRouter();

    const handleRegistration = async () => {
        // Validate form fields
        if (!clubName || !clubDescription || !clubCategory || !leaderName || !leaderEmail || !leaderPosition || !password || !confirmPassword) {
            setAlertMessage('Please fill in all fields.');
            setShowAlert(true);
            return;
        }

        if (password !== confirmPassword) {
            setAlertMessage('Passwords do not match.');
            setShowAlert(true);
            return;
        }

        // Email format validation (but allow any domain)
        if (!leaderEmail.includes('@') || !leaderEmail.includes('.')) {
            setAlertMessage('Please enter a valid email address.');
            setShowAlert(true);
            return;
        }

        setLoading(true);

        try {
            // First sign up with Supabase Auth
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: leaderEmail,
                password: password,
                options: {
                    data: {
                        full_name: leaderName,
                        position: leaderPosition
                    }
                }
            });

            if (authError) {
                console.error('Auth signup error:', authError);
                // If error contains "already registered" we can continue
                if (!authError.message.includes('already registered')) {
                    setAlertMessage(authError.message);
                    setShowAlert(true);
                    setLoading(false);
                    return;
                }
            }

            // Now create the club record
            const { data: clubData, error: clubError } = await supabase
                .from('clubs')
                .insert([
                    {
                        club_name: clubName,
                        club_description: clubDescription,
                        club_category: clubCategory,
                        leader_name: leaderName,
                        leader_email: leaderEmail,
                        leader_position: leaderPosition,
                        leader_password: password
                    }
                ])
                .select()
                .single();

            if (clubError) {
                console.error('Club creation error:', clubError);
                setAlertMessage(clubError.message);
                setShowAlert(true);
                setLoading(false);
                return;
            }

            // Create a profile record for this user if needed
            // Get the user ID from authentication
            const userId = authData?.user?.id;
            if (userId) {
                // Check if profile already exists
                const { data: existingProfile } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('id', userId)
                    .single();
                
                if (!existingProfile) {
                    // Create profile
                    const { error: profileError } = await supabase
                        .from('profiles')
                        .insert([{
                            id: userId,
                            username: leaderEmail.split('@')[0],
                            full_name: leaderName,
                            avatar_url: null
                        }]);
                    
                    if (profileError) {
                        console.error('Error creating profile:', profileError);
                        // Proceed anyway, the profile will be created on first login
                    }
                }
            }

            // Show success modal
            setLoading(false);
            setShowSuccessModal(true);
        } catch (error) {
            console.error('Registration error:', error);
            setAlertMessage('An unexpected error occurred. Please try again.');
            setShowAlert(true);
            setLoading(false);
        }
    };

    const handleSuccess = () => {
        setShowSuccessModal(false);
        navigation.push('/rco-calendar/login', 'forward');
    };

    return (
        <IonPage>
            <IonContent>
                <div style={{ padding: '20px' }}>
                    <IonCard>
                        <IonCardHeader>
                            <IonCardTitle>Register Your Club</IonCardTitle>
                            <IonCardSubtitle>Fill in the details below to register your club</IonCardSubtitle>
                        </IonCardHeader>
                        <IonCardContent>
                            <IonInput
                                id="club-name-input"
                                name="club-name"
                                label="Club Name"
                                labelPlacement="floating"
                                placeholder="Enter club name"
                                value={clubName}
                                onIonChange={e => setClubName(e.detail.value || '')}
                                required
                            ></IonInput>

                            <IonTextarea
                                id="club-description-input"
                                name="club-description"
                                label="Club Description"
                                labelPlacement="floating"
                                placeholder="Describe your club's activities and purpose"
                                value={clubDescription}
                                onIonChange={e => setClubDescription(e.detail.value || '')}
                                rows={4}
                                required
                            ></IonTextarea>

                            <IonSelect
                                id="club-category-select"
                                name="club-category"
                                label="Club Category"
                                labelPlacement="floating"
                                placeholder="Select a category"
                                value={clubCategory}
                                onIonChange={e => setClubCategory(e.detail.value)}
                            >
                                <IonSelectOption value="academic">Academic</IonSelectOption>
                                <IonSelectOption value="cultural">Cultural</IonSelectOption>
                                <IonSelectOption value="sports">Sports</IonSelectOption>
                                <IonSelectOption value="religious">Religious</IonSelectOption>
                                <IonSelectOption value="social">Social Service</IonSelectOption>
                                <IonSelectOption value="other">Other</IonSelectOption>
                            </IonSelect>

                            <IonTitle style={{ marginTop: '20px', fontSize: '18px' }}>Club Leader Information</IonTitle>

                            <IonInput
                                id="leader-name-input"
                                name="leader-name"
                                label="Full Name"
                                labelPlacement="floating"
                                placeholder="Enter leader's full name"
                                value={leaderName}
                                onIonChange={e => setLeaderName(e.detail.value || '')}
                                required
                            ></IonInput>

                            <IonInput
                                id="leader-email-input"
                                name="leader-email"
                                label="Email Address"
                                labelPlacement="floating"
                                placeholder="Enter leader's email address"
                                value={leaderEmail}
                                onIonChange={e => setLeaderEmail(e.detail.value || '')}
                                type="email"
                                required
                            ></IonInput>

                            <IonInput
                                id="leader-position-input"
                                name="leader-position"
                                label="Position"
                                labelPlacement="floating"
                                placeholder="Enter leader's position"
                                value={leaderPosition}
                                onIonChange={e => setLeaderPosition(e.detail.value || '')}
                                required
                            ></IonInput>

                            <IonInput
                                id="password-input"
                                name="password"
                                label="Password"
                                labelPlacement="floating"
                                placeholder="Create a password"
                                value={password}
                                onIonChange={e => setPassword(e.detail.value || '')}
                                type="password"
                                required
                            >
                                <IonInputPasswordToggle slot="end"></IonInputPasswordToggle>
                            </IonInput>

                            <IonInput
                                id="confirm-password-input"
                                name="confirm-password"
                                label="Confirm Password"
                                labelPlacement="floating"
                                placeholder="Confirm your password"
                                value={confirmPassword}
                                onIonChange={e => setConfirmPassword(e.detail.value || '')}
                                type="password"
                                required
                            >
                                <IonInputPasswordToggle slot="end"></IonInputPasswordToggle>
                            </IonInput>

                            <div style={{ marginTop: '20px' }}>
                                <IonButton expand="block" onClick={handleRegistration}>
                                    Register Club
                                </IonButton>
                                <div style={{ textAlign: 'center', marginTop: '15px' }}>
                                    <IonText>Already have an account?</IonText>
                                    <IonButton fill="clear" routerLink="/rco-calendar/login">
                                        Login
                                    </IonButton>
                                </div>
                            </div>
                        </IonCardContent>
                    </IonCard>
                </div>

                {/* Success Modal */}
                <IonModal isOpen={showSuccessModal}>
                    <div style={{ padding: '20px' }}>
                        <h2>Registration Successful!</h2>
                        <p>Your club has been registered successfully.</p>
                        <IonButton expand="block" onClick={handleSuccess}>
                            Go to Login
                        </IonButton>
                    </div>
                </IonModal>

                {/* Alert */}
                <AlertBox
                    message={alertMessage}
                    isOpen={showAlert}
                    onClose={() => setShowAlert(false)}
                />
                
                {/* Loading */}
                <IonLoading
                    isOpen={loading}
                    message="Registering club..."
                />
            </IonContent>
        </IonPage>
    );
};

export default Register;
