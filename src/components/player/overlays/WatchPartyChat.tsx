import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Image,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  FadeIn,
  FadeOut,
  SlideInRight,
  SlideOutRight,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import FastImage from '@d11/react-native-fast-image';
import { useTheme } from '../../../contexts/ThemeContext';
import {
  watchPartyService,
  ChatMessage,
  WatchPartyState,
} from '../../../services/watchPartyService';

const { width, height } = Dimensions.get('window');

// Emoji list for quick reactions
const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '👏'];

interface WatchPartyChatProps {
  visible: boolean;
  onClose: () => void;
}

const WatchPartyChat: React.FC<WatchPartyChatProps> = ({ visible, onClose }) => {
  const { currentTheme } = useTheme();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [partyState, setPartyState] = useState<WatchPartyState>(watchPartyService.getState());
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const flatListRef = useRef<FlatList>(null);

  // Load initial state and subscribe to changes
  useEffect(() => {
    setMessages(watchPartyService.getMessages());
    setPartyState(watchPartyService.getState());

    const onMessagesChanged = (msgs: ChatMessage[]) => {
      setMessages(msgs);
      // Auto-scroll to bottom
      if (flatListRef.current && msgs.length > 0) {
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    };

    const onStateChanged = (state: WatchPartyState) => {
      setPartyState(state);
    };

    watchPartyService.on('messagesChanged', onMessagesChanged);
    watchPartyService.on('stateChanged', onStateChanged);

    return () => {
      watchPartyService.off('messagesChanged', onMessagesChanged);
      watchPartyService.off('stateChanged', onStateChanged);
    };
  }, []);

  const handleSend = () => {
    if (inputText.trim()) {
      watchPartyService.sendMessage(inputText.trim());
      setInputText('');
    }
  };

  const handleReaction = (emoji: string) => {
    watchPartyService.sendMessage(undefined, undefined, emoji);
    setShowEmojiPicker(false);
  };

  const renderMessage = ({ item, index }: { item: ChatMessage; index: number }) => {
    const isMe = item.senderId === watchPartyService.getCurrentUserId();
    const isSystem = item.isSystem;

    if (isSystem) {
      return (
        <View style={styles.systemMessageContainer}>
          <Text style={[styles.systemMessageText, { color: currentTheme.colors.mediumEmphasis }]}>
            {item.text}
          </Text>
        </View>
      );
    }

    return (
      <Animated.View
        entering={FadeIn.duration(300)}
        style={[styles.messageRow, isMe ? styles.myMessageRow : styles.theirMessageRow]}
      >
        {!isMe && (
          <View style={[styles.avatar, { backgroundColor: currentTheme.colors.primary }]}>
            <Text style={styles.avatarText}>{item.senderName.charAt(0).toUpperCase()}</Text>
          </View>
        )}

        <View
          style={[
            styles.messageBubble,
            isMe
              ? [styles.myMessageBubble, { backgroundColor: currentTheme.colors.primary }]
              : [styles.theirMessageBubble, { backgroundColor: 'rgba(255,255,255,0.1)' }],
          ]}
        >
          {!isMe && (
            <Text style={[styles.senderName, { color: currentTheme.colors.mediumEmphasis }]}>
              {item.senderName}
            </Text>
          )}
          {item.text && (
            <Text style={[styles.messageText, { color: currentTheme.colors.highEmphasis }]}>
              {item.text}
            </Text>
          )}
          {item.emoji && <Text style={styles.emojiText}>{item.emoji}</Text>}
        </View>
      </Animated.View>
    );
  };

  if (!visible) return null;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { pointerEvents: 'box-none' }]}
    >
      {/* Minimized / Toggle Button */}
      {!isExpanded && (
        <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.floatingButtonContainer}>
          <TouchableOpacity
            style={[styles.floatingButton, { backgroundColor: 'rgba(0,0,0,0.7)' }]}
            onPress={() => setIsExpanded(true)}
          >
            <MaterialCommunityIcons
              name="account-group"
              size={24}
              color={partyState.isActive ? currentTheme.colors.primary : 'white'}
            />
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Expanded Chat Window */}
      {isExpanded && (
        <Animated.View
          entering={SlideInRight}
          exiting={SlideOutRight}
          style={[styles.chatWindow, { backgroundColor: 'rgba(0,0,0,0.85)' }]}
        >
          <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />

          {/* Header */}
          <View style={[styles.header, { borderBottomColor: 'rgba(255,255,255,0.1)' }]}>
            <Text style={[styles.headerTitle, { color: currentTheme.colors.highEmphasis }]}>
              {partyState.isActive
                ? `Watch Party (${partyState.participants.length})`
                : 'Watch Party'}
            </Text>
            <TouchableOpacity onPress={() => setIsExpanded(false)} style={styles.closeButton}>
              <MaterialIcons name="close" size={20} color={currentTheme.colors.mediumEmphasis} />
            </TouchableOpacity>
          </View>

          {!partyState.isActive ? (
            <View style={styles.startPartyContainer}>
              <MaterialCommunityIcons
                name="party-popper"
                size={48}
                color={currentTheme.colors.primary}
              />
              <Text style={[styles.startPartyTitle, { color: currentTheme.colors.highEmphasis }]}>
                Start a Watch Party
              </Text>
              <Text
                style={[
                  styles.startPartyDescription,
                  { color: currentTheme.colors.mediumEmphasis },
                ]}
              >
                Watch together with friends in sync. Chat, react, and enjoy!
              </Text>
              <TouchableOpacity
                style={[styles.startPartyButton, { backgroundColor: currentTheme.colors.primary }]}
                onPress={() => watchPartyService.startSession()}
              >
                <Text style={styles.startPartyButtonText}>Start Session</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Messages */}
              <FlatList
                ref={flatListRef}
                data={messages}
                renderItem={renderMessage}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.messageList}
                showsVerticalScrollIndicator={false}
              />

              {/* Input Area */}
              <View style={[styles.inputContainer, { borderTopColor: 'rgba(255,255,255,0.1)' }]}>
                {/* Quick Reactions */}
                <View style={styles.reactionsContainer}>
                  {QUICK_REACTIONS.map(emoji => (
                    <TouchableOpacity
                      key={emoji}
                      onPress={() => handleReaction(emoji)}
                      style={styles.reactionButton}
                    >
                      <Text style={styles.reactionText}>{emoji}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.inputRow}>
                  <TouchableOpacity
                    style={styles.voiceButton}
                    onPress={() => {
                      // Voice chat implementation would go here
                      // For now, just a placeholder action
                    }}
                  >
                    <MaterialIcons
                      name="mic"
                      size={24}
                      color={currentTheme.colors.mediumEmphasis}
                    />
                  </TouchableOpacity>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        color: currentTheme.colors.highEmphasis,
                        backgroundColor: 'rgba(255,255,255,0.1)',
                      },
                    ]}
                    placeholder="Type a message..."
                    placeholderTextColor={currentTheme.colors.mediumEmphasis}
                    value={inputText}
                    onChangeText={setInputText}
                    onSubmitEditing={handleSend}
                    returnKeyType="send"
                  />
                  <TouchableOpacity
                    onPress={handleSend}
                    style={[
                      styles.sendButton,
                      {
                        backgroundColor: inputText.trim()
                          ? currentTheme.colors.primary
                          : 'rgba(255,255,255,0.1)',
                      },
                    ]}
                    disabled={!inputText.trim()}
                  >
                    <MaterialIcons name="send" size={20} color="white" />
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}
        </Animated.View>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    zIndex: 100,
  },
  floatingButtonContainer: {
    position: 'absolute',
    right: 20,
    bottom: 100, // Above player controls
  },
  floatingButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  chatWindow: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: Math.min(width * 0.4, 350), // Max width 350px or 40% of screen
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  messageList: {
    padding: 12,
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'flex-end',
  },
  myMessageRow: {
    justifyContent: 'flex-end',
  },
  theirMessageRow: {
    justifyContent: 'flex-start',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  avatarText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  messageBubble: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    maxWidth: '80%',
  },
  myMessageBubble: {
    borderBottomRightRadius: 4,
  },
  theirMessageBubble: {
    borderBottomLeftRadius: 4,
  },
  senderName: {
    fontSize: 10,
    marginBottom: 2,
  },
  messageText: {
    fontSize: 14,
  },
  emojiText: {
    fontSize: 24,
  },
  systemMessageContainer: {
    alignItems: 'center',
    marginVertical: 8,
  },
  systemMessageText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  inputContainer: {
    padding: 12,
    borderTopWidth: 1,
  },
  reactionsContainer: {
    flexDirection: 'row',
    marginBottom: 8,
    justifyContent: 'space-around',
  },
  reactionButton: {
    padding: 4,
  },
  reactionText: {
    fontSize: 20,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    paddingHorizontal: 16,
    marginRight: 8,
  },
  voiceButton: {
    padding: 8,
    marginRight: 4,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  startPartyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  startPartyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    textAlign: 'center',
  },
  startPartyDescription: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  startPartyButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  startPartyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default WatchPartyChat;
