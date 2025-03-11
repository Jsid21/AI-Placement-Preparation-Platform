import cv2
import mediapipe as mp
import numpy as np

# Initialize MediaPipe Face Mesh
mp_face_mesh = mp.solutions.face_mesh
face_mesh = mp_face_mesh.FaceMesh(
    static_image_mode=False,
    max_num_faces=1,
    refine_landmarks=True
)

# Indices for eye landmarks (these are sample indices; adjust if necessary)
LEFT_EYE = [362, 385, 387, 263]    # Approximate landmarks for left eye
RIGHT_EYE = [33, 160, 158, 133]     # Approximate landmarks for right eye

# Function to check head movement based on nose tip position
def check_head_movement(frame):
    # Convert the frame to RGB as MediaPipe uses RGB images
    image_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    results = face_mesh.process(image_rgb)
    
    if results.multi_face_landmarks:
        for face_landmarks in results.multi_face_landmarks:
            # Nose tip landmark (index 1) is used for head positioning
            nose_tip = face_landmarks.landmark[1]
            x, y = nose_tip.x, nose_tip.y  # These are normalized coordinates (0 to 1)
            
            # Adjust thresholds to be more lenient for head centering
            # Only flag as not centered if there's a significant deviation
            if abs(x - 0.5) > 0.15 or abs(y - 0.5) > 0.15:
                return "Head not centered!"
    return "Head is centered"

# Function to check eye gaze based on eye landmarks positions
def check_eye_gaze(frame):
    image_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    results = face_mesh.process(image_rgb)
    
    if results.multi_face_landmarks:
        for face_landmarks in results.multi_face_landmarks:
            # Compute mean position for left and right eyes from selected landmarks
            left_eye_pts = np.array([[face_landmarks.landmark[i].x, face_landmarks.landmark[i].y] for i in LEFT_EYE])
            right_eye_pts = np.array([[face_landmarks.landmark[i].x, face_landmarks.landmark[i].y] for i in RIGHT_EYE])
            left_eye_center = np.mean(left_eye_pts, axis=0)
            right_eye_center = np.mean(right_eye_pts, axis=0)
            
            # Overall eye center is the average of both eyes
            eye_center = (left_eye_center + right_eye_center) / 2
            x, y = eye_center
            
            # Flip the direction (correct left/right inversion)
            # And make the thresholds more sensitive for gaze detection
            if x < 0.45:
                return "Looking right"  # Flipped from left to right
            elif x > 0.55:
                return "Looking left"   # Flipped from right to left
            elif y < 0.45:
                return "Looking up"
            elif y > 0.55:
                return "Looking down"
            else:
                return "Eyes focused"
    return "Unable to detect"

def main():
    # Open the webcam
    cap = cv2.VideoCapture(0)
    
    # Check if the webcam opened successfully
    if not cap.isOpened():
        print("Error: Could not open webcam.")
        return
    
    print("Webcam opened successfully. Press 'q' to exit.")
    
    # Create a named window
    cv2.namedWindow("Interview Monitoring", cv2.WINDOW_NORMAL)

    while True:
        # Read a frame from the webcam
        ret, frame = cap.read()
        if not ret:
            print("Failed to grab frame")
            break

        # Get head and eye movement status
        head_status = check_head_movement(frame)
        eye_status = check_eye_gaze(frame)
        
        # Overlay the status text on the frame
        cv2.putText(frame, head_status, (50, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
        cv2.putText(frame, eye_status, (50, 100), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 0, 0), 2)
        
        # Display the processed frame
        cv2.imshow("Interview Monitoring", frame)
        
        # Press 'q' to exit
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    # Release resources
    cap.release()
    cv2.destroyAllWindows()
    print("Application closed")

if __name__ == "__main__":
    main()
