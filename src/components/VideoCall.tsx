import React, { useEffect, useRef, useState } from 'react';
import AgoraRTC, { IAgoraRTCClient, ICameraVideoTrack, IMicrophoneAudioTrack } from 'agora-rtc-sdk-ng';
import { Video, Mic, MicOff, Phone, PhoneOff, Camera, CameraOff, Volume2, VolumeX } from 'lucide-react';
import { cn } from '../lib/utils';

interface VideoCallProps {
  channelName: string;
  token: string;
  uid?: string;
  onCallEnd?: () => void;
  isDoctor?: boolean;
}

export const VideoCall: React.FC<VideoCallProps> = ({
  channelName,
  token,
  uid,
  onCallEnd,
  isDoctor = false
}) => {
  const [client, setClient] = useState<IAgoraRTCClient | null>(null);
  const [localVideoTrack, setLocalVideoTrack] = useState<ICameraVideoTrack | null>(null);
  const [localAudioTrack, setLocalAudioTrack] = useState<IMicrophoneAudioTrack | null>(null);
  const [remoteUsers, setRemoteUsers] = useState<any[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isRemoteAudioEnabled, setIsRemoteAudioEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const localVideoRef = useRef<HTMLDivElement>(null);
  const remoteVideoRef = useRef<HTMLDivElement>(null);

  // Agora App ID - In production, this should be from environment variables
  const appId = (import.meta as any).env?.VITE_AGORA_APP_ID || 'demo_app_id';

  useEffect(() => {
    initializeAgoraClient();

    return () => {
      cleanup();
    };
  }, []);

  const initializeAgoraClient = async () => {
    try {
      // Create Agora client
      const agoraClient = AgoraRTC.createClient({
        mode: 'rtc',
        codec: 'vp8'
      });

      setClient(agoraClient);

      // Set up event listeners
      agoraClient.on('user-published', async (user, mediaType) => {
        await agoraClient.subscribe(user, mediaType);
        console.log('User published:', user.uid, mediaType);

        if (mediaType === 'video') {
          setRemoteUsers(prev => {
            const existingUser = prev.find(u => u.uid === user.uid);
            if (existingUser) {
              return prev.map(u =>
                u.uid === user.uid ? { ...u, videoTrack: user.videoTrack } : u
              );
            } else {
              return [...prev, { uid: user.uid, videoTrack: user.videoTrack, audioTrack: user.audioTrack }];
            }
          });
        }

        if (mediaType === 'audio') {
          setRemoteUsers(prev => {
            const existingUser = prev.find(u => u.uid === user.uid);
            if (existingUser) {
              return prev.map(u =>
                u.uid === user.uid ? { ...u, audioTrack: user.audioTrack } : u
              );
            } else {
              return [...prev, { uid: user.uid, videoTrack: user.videoTrack, audioTrack: user.audioTrack }];
            }
          });
        }
      });

      agoraClient.on('user-unpublished', (user, mediaType) => {
        console.log('User unpublished:', user.uid, mediaType);
        if (mediaType === 'video') {
          setRemoteUsers(prev =>
            prev.map(u =>
              u.uid === user.uid ? { ...u, videoTrack: null } : u
            )
          );
        }
        if (mediaType === 'audio') {
          setRemoteUsers(prev =>
            prev.map(u =>
              u.uid === user.uid ? { ...u, audioTrack: null } : u
            )
          );
        }
      });

      agoraClient.on('user-left', (user) => {
        console.log('User left:', user.uid);
        setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid));
      });

      // Join channel
      await agoraClient.join(appId, channelName, token, uid);

      // Create and publish local tracks
      const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();

      setLocalAudioTrack(audioTrack);
      setLocalVideoTrack(videoTrack);

      // Publish tracks
      await agoraClient.publish([audioTrack, videoTrack]);

      // Play local video
      if (localVideoRef.current && videoTrack) {
        videoTrack.play(localVideoRef.current);
      }

      setIsConnected(true);
      setError(null);

    } catch (err) {
      console.error('Failed to initialize Agora client:', err);
      setError('Failed to connect to video call. Please try again.');
    }
  };

  const toggleVideo = async () => {
    if (!localVideoTrack) return;

    try {
      if (isVideoEnabled) {
        await localVideoTrack.setEnabled(false);
        setIsVideoEnabled(false);
      } else {
        await localVideoTrack.setEnabled(true);
        setIsVideoEnabled(true);
      }
    } catch (err) {
      console.error('Failed to toggle video:', err);
    }
  };

  const toggleAudio = async () => {
    if (!localAudioTrack) return;

    try {
      if (isAudioEnabled) {
        await localAudioTrack.setEnabled(false);
        setIsAudioEnabled(false);
      } else {
        await localAudioTrack.setEnabled(true);
        setIsAudioEnabled(true);
      }
    } catch (err) {
      console.error('Failed to toggle audio:', err);
    }
  };

  const toggleRemoteAudio = () => {
    setIsRemoteAudioEnabled(!isRemoteAudioEnabled);
    // In a real implementation, you'd mute remote audio tracks
  };

  const endCall = async () => {
    await cleanup();
    onCallEnd?.();
  };

  const cleanup = async () => {
    try {
      if (localVideoTrack) {
        localVideoTrack.stop();
        localVideoTrack.close();
      }
      if (localAudioTrack) {
        localAudioTrack.stop();
        localAudioTrack.close();
      }
      if (client) {
        await client.leave();
      }
    } catch (err) {
      console.error('Error during cleanup:', err);
    }

    setClient(null);
    setLocalVideoTrack(null);
    setLocalAudioTrack(null);
    setRemoteUsers([]);
    setIsConnected(false);
  };

  // Play remote video when remote users change
  useEffect(() => {
    remoteUsers.forEach(user => {
      if (user.videoTrack && remoteVideoRef.current) {
        user.videoTrack.play(remoteVideoRef.current);
      }
    });
  }, [remoteUsers]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 bg-red-50 rounded-2xl border-2 border-red-200">
        <div className="text-red-600 text-center">
          <PhoneOff className="w-16 h-16 mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2">Connection Failed</h3>
          <p className="text-sm mb-4">{error}</p>
          <button
            onClick={initializeAgoraClient}
            className="px-6 py-3 bg-red-600 text-white rounded-xl font-bold"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-96 bg-gray-900 rounded-2xl overflow-hidden">
      {/* Remote Video */}
      <div
        ref={remoteVideoRef}
        className="absolute inset-0 w-full h-full bg-gray-800"
      >
        {remoteUsers.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-white">
              <Video className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-semibold">
                {isDoctor ? 'Waiting for patient...' : 'Connecting to doctor...'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Local Video (Picture-in-Picture) */}
      <div className="absolute top-4 right-4 w-32 h-24 bg-gray-800 rounded-lg overflow-hidden border-2 border-white">
        <div
          ref={localVideoRef}
          className="w-full h-full"
        />
        {!isVideoEnabled && (
          <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
            <CameraOff className="w-8 h-8 text-white opacity-50" />
          </div>
        )}
      </div>

      {/* Connection Status */}
      <div className="absolute top-4 left-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
        {isConnected ? '🟢 Connected' : '🟡 Connecting...'}
      </div>

      {/* Call Duration (placeholder) */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
        {isDoctor ? 'Doctor View' : 'Patient View'}
      </div>

      {/* Control Buttons */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-4">
        <button
          onClick={toggleVideo}
          className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center transition-all",
            isVideoEnabled
              ? "bg-white text-gray-900 hover:bg-gray-100"
              : "bg-red-500 text-white hover:bg-red-600"
          )}
        >
          {isVideoEnabled ? <Camera className="w-6 h-6" /> : <CameraOff className="w-6 h-6" />}
        </button>

        <button
          onClick={toggleAudio}
          className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center transition-all",
            isAudioEnabled
              ? "bg-white text-gray-900 hover:bg-gray-100"
              : "bg-red-500 text-white hover:bg-red-600"
          )}
        >
          {isAudioEnabled ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
        </button>

        <button
          onClick={toggleRemoteAudio}
          className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center transition-all",
            isRemoteAudioEnabled
              ? "bg-white text-gray-900 hover:bg-gray-100"
              : "bg-red-500 text-white hover:bg-red-600"
          )}
        >
          {isRemoteAudioEnabled ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
        </button>

        <button
          onClick={endCall}
          className="w-12 h-12 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-all"
        >
          <PhoneOff className="w-6 h-6" />
        </button>
      </div>

      {/* Emergency Info Overlay */}
      <div className="absolute bottom-20 left-4 right-4 bg-black/70 text-white p-3 rounded-lg">
        <div className="flex items-center justify-between text-sm">
          <span>Emergency Call Active</span>
          <span className="text-red-400 font-bold">LIVE</span>
        </div>
        <p className="text-xs mt-1 opacity-80">
          {isDoctor
            ? "Stay calm and provide clear instructions to the patient."
            : "Follow the doctor's instructions carefully. Help is on the way."
          }
        </p>
      </div>
    </div>
  );
};