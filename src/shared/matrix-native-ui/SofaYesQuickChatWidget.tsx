"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { createPortal } from 'react-dom';
import { InteractiveBottomSheet } from './InteractiveBottomSheet';

export const SOFAYES_WORDMARK_PATH =
  'M118.14,47.59L114.58,49.17L111.67,51.53L108.50,55.40L106.28,59.30L103.84,64.78L101.82,70.67L99.59,78.91L97.86,87.81L97.03,89.30L96.13,88.81L93.83,86.52L90.74,84.38L87.89,82.87L84.63,81.65L81.20,80.91L76.74,80.85L74.41,81.10L70.43,82.33L68.13,83.50L65.12,85.79L63.43,87.56L61.34,90.77L60.03,93.81L59.09,97.22L58.54,104.71L57.60,105.50L53.26,107.48L52.29,107.64L52.03,106.79L52.39,104.02L52.27,102.65L50.31,93.68L50.80,92.63L54.65,87.59L55.21,85.57L55.08,84.00L53.75,81.86L52.11,80.88L49.58,80.46L46.21,80.96L43.06,83.03L30.39,99.39L22.25,107.04L21.14,109.34L21.12,111.91L21.54,113.17L22.49,113.95L26.13,114.81L27.62,117.62L28.94,118.97L30.52,120.01L32.95,120.98L37.55,121.69L45.18,121.02L49.35,120.01L55.24,118.04L61.18,115.31L62.04,115.64L63.63,117.64L65.04,118.87L68.47,120.69L71.47,121.17L76.55,120.84L80.11,119.21L82.60,117.30L85.11,114.55L87.39,110.69L89.02,106.15L89.42,104.08L89.47,96.97L88.89,93.59L89.43,93.47L95.03,98.51L95.86,100.46L94.21,119.00L94.15,123.40L95.04,132.03L96.11,136.13L98.09,140.25L100.16,142.60L102.38,143.91L105.74,144.63L109.89,143.70L113.49,141.17L116.39,137.05L118.87,130.75L120.09,125.11L120.21,118.04L120.01,116.48L118.79,112.51L116.63,107.39L116.63,106.04L117.15,105.63L121.42,105.10L124.25,104.28L124.99,104.42L125.47,104.90L125.65,105.67L125.28,109.31L125.57,111.98L126.61,115.23L128.02,117.39L129.27,118.70L133.15,120.95L136.51,121.19L139.81,120.90L144.03,119.02L147.92,116.31L150.91,119.94L152.51,120.91L154.02,121.30L155.83,121.46L158.44,121.09L160.31,120.38L163.10,118.78L167.77,114.67L170.26,111.77L170.88,110.28L169.19,102.44L168.91,101.83L167.93,101.16L167.33,101.12L166.27,101.66L162.61,105.99L159.35,108.91L157.53,109.70L156.49,109.17L156.29,106.66L158.65,95.15L159.55,89.09L159.48,87.54L158.95,85.58L158.27,84.45L157.30,83.75L152.44,83.25L150.22,81.15L148.84,80.64L147.05,80.52L144.45,80.91L140.75,82.38L137.09,84.84L133.94,87.87L131.63,90.75L129.11,90.87L124.81,93.67L119.73,95.50L115.33,95.97L113.63,95.63L113.21,95.17L113.55,94.00L114.86,92.45L120.02,84.49L125.83,73.61L128.83,66.06L130.50,59.08L130.52,55.84L130.07,53.90L128.96,51.43L127.33,49.52L125.75,48.45L123.29,47.53L120.69,47.37ZM119.28,57.40L120.38,57.37L121.20,58.33L121.40,60.12L120.84,62.48L117.02,70.92L111.80,79.94L111.02,80.57L110.76,80.27L110.80,78.89L114.01,67.96L117.60,59.22L118.31,58.10ZM74.57,91.69L76.77,91.10L77.53,91.28L78.55,92.18L79.51,95.49L79.74,98.80L78.87,103.95L77.50,107.83L75.60,110.37L74.56,111.02L73.57,111.16L71.85,110.34L70.68,108.80L70.08,106.71L69.97,103.15L70.37,99.73L71.38,96.44L72.88,93.57ZM145.71,91.56L146.27,91.49L146.68,91.82L146.77,93.43L143.81,105.62L141.75,109.71L140.26,110.99L139.20,111.21L138.07,110.01L137.70,107.57L137.94,104.96L138.90,101.62L141.79,95.72L144.19,92.85ZM39.53,103.06L40.00,102.94L40.37,103.23L40.58,103.90L40.46,110.20L39.45,111.98L37.75,112.85L36.80,112.85L33.89,111.26L33.35,110.15L33.44,109.54ZM106.42,105.02L106.63,104.81L107.15,105.58L108.08,108.43L108.81,112.76L109.10,119.84L108.80,128.63L107.98,131.33L107.21,132.34L106.77,132.40L106.41,132.05L106.05,130.44L105.31,121.59L105.39,115.44Z';

export type QuickChatLocale = 'zh' | 'en';

export type QuickChatMediaFeature =
  | 'image'
  | 'voice'
  | 'video'
  | 'attachment'
  | 'call'
  | 'expand';

export type QuickChatErrorCode =
  | 'ERR_IM_UNREACHABLE'
  | 'ERR_IM_SEND_FAILED'
  | 'ERR_IM_EMPTY_TEXT'
  | 'ERR_IM_SEARCH_FAILED';

export interface QuickChatMessageItem {
  id: string;
  senderId: string;
  senderName?: string;
  type:
    | 'TEXT'
    | 'IMAGE'
    | 'VIDEO'
    | 'VOICE'
    | 'FILE'
    | 'LOCATION'
    | 'CONTACT_CARD'
    | 'RED_PACKET'
    | 'TRANSFER'
    | 'CALL_LOG'
    | 'SYSTEM'
    | string;
  content: string;
  createdAt: string;
  status?: string;
}

export interface QuickChatConversationItem {
  id: string;
  name: string;
  avatar?: string;
  verified?: boolean;
  unreadCount: number;
  lastMessageText?: string;
  lastMessageType?: string;
  lastMessageSenderIsSelf?: boolean;
  updatedAt?: string;
  isMuted?: boolean;
  isPinned?: boolean;
  peerUserId?: string;
  source?: 'im-api' | 'cf-worker' | 'host';
}

export interface OpenQuickChatOptions {
  peerId?: string;
  peerName?: string;
  peerAvatar?: string;
  conversationId?: string;
}

export interface SofaYesQuickChatTriggerProps {
  variant?: 'icon-badge' | 'floating-pill' | 'capsule-chip';
  locale?: QuickChatLocale;
  unreadOverride?: number;
  label?: string;
  tone?: 'dark' | 'light';
  size?: number;
  onClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
  testId?: string;
}

export interface SofaYesQuickChatWidgetProps {
  locale?: QuickChatLocale;
  downloadUrl?: string;
  onRedirectToDownloadApp?: (
    feature: QuickChatMediaFeature,
    context?: { conversationId?: string; peerName?: string },
  ) => void;
  imApiBaseUrl?: string;
  userId?: string;
  appId?: string;
  hideFloatingTrigger?: boolean;
  hideFloatingTriggerOnMobile?: boolean;
  floatingPosition?: 'bottom-right' | 'bottom-left';
  externalConversations?: QuickChatConversationItem[];
  externalUnreadCount?: number;
  onFetchMessages?: (conversationId: string) => Promise<QuickChatMessageItem[]>;
  onSendTextMessage?: (
    conversationId: string,
    text: string,
  ) => Promise<QuickChatMessageItem | void>;
  onMarkConversationRead?: (conversationId: string) => Promise<void> | void;
  onAnalyticsEvent?: (
    event: string,
    props: Record<string, string | number | boolean>,
  ) => void;
}

const DEFAULT_CF_WORKER_HTTP =
  'https://sofayes-marrychat-rt.linxiaoxiao0927.workers.dev';
const DEFAULT_CF_WORKER_WS =
  'wss://sofayes-marrychat-rt.linxiaoxiao0927.workers.dev';
const DEFAULT_CF_ROOM = 'shinemight-hub';
const DEFAULT_DOWNLOAD_URL = 'https://sofayes.com/download';
const BROADCAST_CHANNEL_NAME = 'sofayes_quick_chat_sync_v1';
const PENDING_DOWNLOAD_FEATURE_KEY = 'sofayes_download_redirect_feature';
const QUICK_CHAT_STYLE_ID = 'sofayes-quick-chat-styles';

const QUICK_CHAT_SCOPED_CSS = `
.sfy-qc-root,
.sfy-qc-root * {
  box-sizing: border-box;
}
.sfy-qc-root {
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "PingFang SC", "Helvetica Neue", sans-serif;
}
.sfy-qc-root input,
.sfy-qc-root textarea {
  -webkit-touch-callout: default;
  -webkit-user-select: text;
  user-select: text;
}
.sfy-qc-noscrollbar::-webkit-scrollbar {
  display: none;
  width: 0;
  height: 0;
}
.sfy-qc-noscrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
`;

const COPY: Record<
  QuickChatLocale,
  {
    messagesTitle: string;
    unreadLabel: string;
    expandTitle: string;
    closeLabel: string;
    backLabel: string;
    newChatLabel: string;
    searchPlaceholder: string;
    tapToChat: string;
    selfPrefix: string;
    sentAttachment: string;
    sentImage: string;
    sentVoice: string;
    sentVideo: string;
    textOnlySubtitle: string;
    textOnlyNotice: string;
    inputPlaceholder: string;
    sendLabel: string;
    emptyConversations: string;
    emptyMessages: string;
    loading: string;
    retry: string;
    mediaImage: string;
    mediaVoice: string;
    mediaVideo: string;
    mediaAttachment: string;
    mediaCall: string;
    mediaCardHint: string;
    triggerLabel: string;
    downloadChip: string;
    justNow: string;
    minutesAgo: (n: number) => string;
    hoursAgo: (n: number) => string;
    daysAgo: (n: number) => string;
    weeksAgo: (n: number) => string;
    yearsAgo: (n: number) => string;
    errors: Record<QuickChatErrorCode, string>;
  }
> = {
  zh: {
    messagesTitle: '消息',
    unreadLabel: '未读消息',
    expandTitle: '打开 SofaYes App 获取完整体验',
    closeLabel: '关闭聊天窗口',
    backLabel: '返回消息列表',
    newChatLabel: '发起新文字对话',
    searchPlaceholder: '搜索联系人开始文字聊天...',
    tapToChat: '点击以聊天',
    selfPrefix: '你: ',
    sentAttachment: '发送了附件。',
    sentImage: '[图片] 下载 APP 查看',
    sentVoice: '[语音] 下载 APP 收听',
    sentVideo: '[视频] 下载 APP 播放',
    textOnlySubtitle: '仅支持文字聊天 · 图片语音请用 APP',
    textOnlyNotice: '快捷窗口仅支持极简文字聊天；发送图片、语音或音视频请安装 SofaYes APP。',
    inputPlaceholder: '发送文字消息...',
    sendLabel: '发送',
    emptyConversations: '暂无最近会话，点击右下角发起文字对话',
    emptyMessages: '暂无消息记录，发一句文字打个招呼吧',
    loading: '正在同步会话...',
    retry: '重新同步',
    mediaImage: '发图片',
    mediaVoice: '发语音',
    mediaVideo: '发视频',
    mediaAttachment: '文件/通话',
    mediaCall: '通话',
    mediaCardHint: '点击跳转下载安装 SofaYes APP 查看完整内容',
    triggerLabel: 'SofaYes 消息',
    downloadChip: '下载 APP 解锁音视频',
    justNow: '刚刚',
    minutesAgo: (n) => `${n}分钟`,
    hoursAgo: (n) => `${n}小时`,
    daysAgo: (n) => `${n}天`,
    weeksAgo: (n) => `${n}周`,
    yearsAgo: (n) => `${n}年`,
    errors: {
      ERR_IM_UNREACHABLE: '暂时无法连接 SofaYes 消息通道，请检查网络后重试。',
      ERR_IM_SEND_FAILED: '文字消息发送失败，已恢复输入框内容。',
      ERR_IM_EMPTY_TEXT: '请输入文字内容后再发送。',
      ERR_IM_SEARCH_FAILED: '联系人检索暂时不可用，请稍后重试。',
    },
  },
  en: {
    messagesTitle: 'Messages',
    unreadLabel: 'Unread messages',
    expandTitle: 'Open SofaYes App for full features',
    closeLabel: 'Close chat',
    backLabel: 'Back to messages',
    newChatLabel: 'New text chat',
    searchPlaceholder: 'Search contacts for text chat...',
    tapToChat: 'Tap to chat',
    selfPrefix: 'You: ',
    sentAttachment: 'Sent an attachment.',
    sentImage: '[Image] Get App to view',
    sentVoice: '[Voice] Get App to listen',
    sentVideo: '[Video] Get App to watch',
    textOnlySubtitle: 'Text-only chat · Media requires App',
    textOnlyNotice: 'Quick chat supports text only. Download the SofaYes App for photos, voice, and video.',
    inputPlaceholder: 'Message...',
    sendLabel: 'Send',
    emptyConversations: 'No recent chats yet. Start a new text chat below.',
    emptyMessages: 'No messages yet. Say hello with a text message.',
    loading: 'Syncing messages...',
    retry: 'Retry',
    mediaImage: 'Photo',
    mediaVoice: 'Voice',
    mediaVideo: 'Video',
    mediaAttachment: 'More',
    mediaCall: 'Call',
    mediaCardHint: 'Tap to install SofaYes App for media & calls',
    triggerLabel: 'SofaYes Chat',
    downloadChip: 'Get App for Media',
    justNow: 'Now',
    minutesAgo: (n) => `${n}m`,
    hoursAgo: (n) => `${n}h`,
    daysAgo: (n) => `${n}d`,
    weeksAgo: (n) => `${n}w`,
    yearsAgo: (n) => `${n}y`,
    errors: {
      ERR_IM_UNREACHABLE: 'Unable to reach SofaYes messaging right now. Please retry.',
      ERR_IM_SEND_FAILED: 'Text message failed to send. Your draft was restored.',
      ERR_IM_EMPTY_TEXT: 'Please enter a text message before sending.',
      ERR_IM_SEARCH_FAILED: 'Contact search is temporarily unavailable.',
    },
  },
};

function detectHostLocale(explicit?: QuickChatLocale): QuickChatLocale {
  if (explicit === 'zh' || explicit === 'en') return explicit;
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('sofayes_language');
      if (saved === 'en') return 'en';
      if (saved === 'zh') return 'zh';
    } catch {}
    const docLang = document.documentElement?.lang?.toLowerCase() || '';
    if (docLang.startsWith('en')) return 'en';
    if (docLang.startsWith('zh')) return 'zh';
    const navLang = navigator.language?.toLowerCase() || '';
    if (navLang.startsWith('en')) return 'en';
  }
  return 'zh';
}

function resolveActiveUser(explicitUserId?: string): {
  userId: string;
  displayName: string;
} {
  if (explicitUserId && explicitUserId.trim()) {
    return { userId: explicitUserId.trim(), displayName: explicitUserId.trim() };
  }
  if (typeof window !== 'undefined') {
    try {
      const zRaw = localStorage.getItem('sofayes-auth-storage');
      if (zRaw) {
        const zUser = JSON.parse(zRaw)?.state?.user;
        const zId = zUser?.id || zUser?.userId;
        if (
          typeof zId === 'string' &&
          zId &&
          zId !== 'current-user-id'
        ) {
          return {
            userId: zId,
            displayName: zUser.displayName || zUser.name || zId,
          };
        }
      }
    } catch {}
    try {
      const uRaw =
        localStorage.getItem('sofayes_user') ||
        localStorage.getItem('user') ||
        localStorage.getItem('currentUser');
      if (uRaw) {
        const u = JSON.parse(uRaw);
        const id = u?.id || u?.userId;
        if (
          typeof id === 'string' &&
          id &&
          id !== 'current-user-id'
        ) {
          return {
            userId: id,
            displayName: u.displayName || u.name || id,
          };
        }
      }
    } catch {}
    try {
      const rtRaw = localStorage.getItem('sofayes_rt_identity_v1');
      if (rtRaw) {
        const rt = JSON.parse(rtRaw);
        if (rt?.userId) {
          return { userId: String(rt.userId), displayName: String(rt.name || rt.userId) };
        }
      }
    } catch {}
  }
  return { userId: 'usr-001', displayName: 'Lin Tao' };
}

function resolveCandidateImOrigins(explicitBaseUrl?: string): string[] {
  const candidates: string[] = [];
  if (explicitBaseUrl !== undefined) {
    candidates.push(explicitBaseUrl.replace(/\/$/, ''));
    return candidates;
  }
  candidates.push('https://im.sofayes.com');
  if (typeof window !== 'undefined') {
    const { hostname, port, protocol } = window.location;
    if (port === '3003' || port === '3001') {
      candidates.push('');
    }
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.endsWith('.local')
    ) {
      if (port !== '3001') {
        candidates.push('http://127.0.0.1:3001');
      }
    } else if (protocol.startsWith('http')) {
      candidates.push('');
    }
  }
  return Array.from(new Set(candidates));
}

function formatRelativeTime(isoOrTs: string | number | undefined, locale: QuickChatLocale): string {
  if (!isoOrTs) return '';
  const ts =
    typeof isoOrTs === 'number' ? isoOrTs : new Date(isoOrTs).getTime();
  if (!Number.isFinite(ts) || ts <= 0) return '';
  const diffMs = Math.max(0, Date.now() - ts);
  const c = COPY[locale];
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return c.justNow;
  if (mins < 60) return c.minutesAgo(mins);
  const hours = Math.floor(mins / 60);
  if (hours < 24) return c.hoursAgo(hours);
  const days = Math.floor(hours / 24);
  if (days < 7) return c.daysAgo(days);
  const weeks = Math.floor(days / 7);
  if (weeks < 52) return c.weeksAgo(weeks);
  return c.yearsAgo(Math.floor(weeks / 52));
}

function formatUnreadBadge(count: number): string {
  if (!Number.isFinite(count) || count <= 0) return '';
  return count > 99 ? '99+' : String(Math.floor(count));
}

function ensureScopedStyles(): void {
  if (typeof document === 'undefined') return;
  let el = document.getElementById(QUICK_CHAT_STYLE_ID);
  if (!el) {
    el = document.createElement('style');
    el.id = QUICK_CHAT_STYLE_ID;
    el.textContent = QUICK_CHAT_SCOPED_CSS;
    document.head.appendChild(el);
  } else if (el.textContent !== QUICK_CHAT_SCOPED_CSS) {
    el.textContent = QUICK_CHAT_SCOPED_CSS;
  }
}

function formatSnippetFromDto(conv: any, viewerId: string, locale: QuickChatLocale): {
  text: string;
  isSelf: boolean;
  type: string;
} {
  const c = COPY[locale];
  const last = conv?.lastMessage;
  if (!last) {
    return { text: '', isSelf: false, type: 'TEXT' };
  }
  const type = String(last.type || 'TEXT').toUpperCase();
  const isSelf = last.senderId === viewerId || last.isSelf === true;
  if (type === 'IMAGE') return { text: c.sentImage, isSelf, type };
  if (type === 'VOICE') return { text: c.sentVoice, isSelf, type };
  if (type === 'VIDEO') return { text: c.sentVideo, isSelf, type };
  if (
    type === 'FILE' ||
    type === 'LOCATION' ||
    type === 'CONTACT_CARD' ||
    type === 'RED_PACKET' ||
    type === 'TRANSFER' ||
    type === 'CALL_LOG'
  ) {
    return { text: c.sentAttachment, isSelf, type };
  }
  return { text: String(last.content || ''), isSelf, type };
}

function mapImDtoToItem(dto: any, viewerId: string, locale: QuickChatLocale): QuickChatConversationItem {
  const snippet = formatSnippetFromDto(dto, viewerId, locale);
  const peer = dto?.peerUser;
  const isVerified =
    dto?.subType === 'INSTITUTION' ||
    dto?.subType === 'MERCHANT' ||
    peer?.puppetCategory === 'INSTITUTION' ||
    peer?.puppetCategory === 'MERCHANT' ||
    Boolean(peer?.verified);

  return {
    id: String(dto.id),
    name: String(dto.remarkName || dto.name || peer?.displayName || 'SofaYes'),
    avatar: String(dto.avatar || peer?.avatar || ''),
    verified: isVerified,
    unreadCount: Number(dto.unreadCount || 0),
    lastMessageText: snippet.text,
    lastMessageType: snippet.type,
    lastMessageSenderIsSelf: snippet.isSelf,
    updatedAt: String(dto.lastMessage?.createdAt || dto.updatedAt || dto.createdAt || ''),
    isMuted: Boolean(dto.isMuted),
    isPinned: Boolean(dto.isPinned),
    peerUserId: peer?.id ? String(peer.id) : undefined,
    source: 'im-api',
  };
}

// ---------------------------------------------------------------------------
// Shared Quick-Chat Reactive Store (Singleton across Triggers & Widget)
// ---------------------------------------------------------------------------

interface QuickChatStoreState {
  isOpen: boolean;
  activeConvId: string | null;
  conversations: QuickChatConversationItem[];
  messagesByConvId: Record<string, QuickChatMessageItem[]>;
  loadingConvs: boolean;
  loadingMsgs: boolean;
  errorCode: QuickChatErrorCode | null;
  dataSource: 'im-api' | 'cf-worker' | 'host' | null;
  activeImOrigin: string | null;
  composeOpen: boolean;
  unreadOverride: number | null;
}

const storeState: QuickChatStoreState = {
  isOpen: false,
  activeConvId: null,
  conversations: [],
  messagesByConvId: {},
  loadingConvs: false,
  loadingMsgs: false,
  errorCode: null,
  dataSource: null,
  activeImOrigin: null,
  composeOpen: false,
  unreadOverride: null,
};

const listeners = new Set<() => void>();
let snapshotVersion = 0;
let cachedSnapshot = { ...storeState, version: snapshotVersion };
let broadcastChannel: BroadcastChannel | null = null;
let fetchConvsInFlight: Promise<void> | null = null;

function setConvMessages(convId: string, items: QuickChatMessageItem[]): void {
  storeState.messagesByConvId = {
    ...storeState.messagesByConvId,
    [convId]: items,
  };
}

function notifyStore(broadcast = false): void {
  snapshotVersion += 1;
  cachedSnapshot = { ...storeState, version: snapshotVersion };
  listeners.forEach((fn) => fn());
  if (broadcast && typeof window !== 'undefined') {
    const totalUnread = storeState.conversations.reduce(
      (sum, c) => sum + (c.isMuted ? 0 : Math.max(0, c.unreadCount)),
      0,
    );
    try {
      if (!broadcastChannel && 'BroadcastChannel' in window) {
        broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      }
      broadcastChannel?.postMessage({
        type: 'QUICK_CHAT_SYNC',
        totalUnread,
        conversations: storeState.conversations,
      });
    } catch {}
  }
}

function subscribeStore(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getStoreSnapshot() {
  return cachedSnapshot;
}

async function fetchWithTimeout(url: string, init?: RequestInit, timeoutMs = 2200): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function prefetchSofaYesQuickChat(options?: {
  imApiBaseUrl?: string;
  userId?: string;
  locale?: QuickChatLocale;
}): Promise<void> {
  if (fetchConvsInFlight) return fetchConvsInFlight;
  const locale = detectHostLocale(options?.locale);
  const { userId } = resolveActiveUser(options?.userId);
  const origins = resolveCandidateImOrigins(options?.imApiBaseUrl);

  fetchConvsInFlight = (async () => {
    storeState.loadingConvs = true;
    storeState.errorCode = null;
    notifyStore();

    for (const origin of origins) {
      try {
        const url = `${origin}/api/im/conversations?userId=${encodeURIComponent(userId)}&subType=ALL`;
        const res = await fetchWithTimeout(url, { cache: 'no-store' }, 2200);
        if (!res.ok) continue;
        const json = await res.json();
        if (json?.ok && Array.isArray(json.items)) {
          storeState.conversations = json.items.map((d: any) =>
            mapImDtoToItem(d, userId, locale),
          );
          storeState.dataSource = 'im-api';
          storeState.activeImOrigin = origin;
          storeState.loadingConvs = false;
          storeState.errorCode = null;
          notifyStore(true);
          return;
        }
      } catch {
        // Try next candidate
      }
    }

    // Fallback to live Cloudflare Durable Object Realtime Worker
    try {
      const cfRes = await fetchWithTimeout(
        `${DEFAULT_CF_WORKER_HTTP}/sofayes/history?room=${encodeURIComponent(DEFAULT_CF_ROOM)}`,
        { cache: 'no-store' },
        3200,
      );
      if (cfRes.ok) {
        const data = await cfRes.json();
        const rawMsgs = Array.isArray(data?.messages) ? data.messages : [];
        const mappedMsgs: QuickChatMessageItem[] = rawMsgs.map((m: any) => ({
          id: String(m.id || `cf-${m.created_at}`),
          senderId: String(m.sender_id || 'remote'),
          senderName: String(m.sender_name || m.sender_id || 'SofaYes'),
          type: 'TEXT',
          content: String(m.body || ''),
          createdAt: new Date(Number(m.created_at || Date.now())).toISOString(),
        }));
        const last = mappedMsgs[mappedMsgs.length - 1];
        const hubConvId = `cf-room-${DEFAULT_CF_ROOM}`;
        const hubConv: QuickChatConversationItem = {
          id: hubConvId,
          name: locale === 'zh' ? 'SofaYes 实时频道' : 'SofaYes Live Channel',
          verified: true,
          unreadCount: mappedMsgs.length > 0 ? 1 : 0,
          lastMessageText: last?.content || '',
          lastMessageType: 'TEXT',
          lastMessageSenderIsSelf: last?.senderId === userId,
          updatedAt: last?.createdAt || new Date().toISOString(),
          source: 'cf-worker',
        };
        storeState.conversations = [hubConv];
        setConvMessages(hubConvId, mappedMsgs);
        storeState.dataSource = 'cf-worker';
        storeState.loadingConvs = false;
        storeState.errorCode = null;
        notifyStore(true);
        return;
      }
    } catch {
      // Both IM API and CF Worker failed
    }

    storeState.loadingConvs = false;
    if (storeState.conversations.length === 0) {
      storeState.errorCode = 'ERR_IM_UNREACHABLE';
    }
    notifyStore();
  })().finally(() => {
    fetchConvsInFlight = null;
  });

  return fetchConvsInFlight;
}

export function openSofaYesQuickChat(opts?: OpenQuickChatOptions): void {
  storeState.isOpen = true;
  storeState.composeOpen = false;
  if (opts?.conversationId) {
    storeState.activeConvId = opts.conversationId;
  } else if (opts?.peerId) {
    const match = storeState.conversations.find(
      (c) => c.peerUserId === opts.peerId || c.id === opts.peerId,
    );
    if (match) {
      storeState.activeConvId = match.id;
    } else {
      const tempId = `direct-${opts.peerId}`;
      const existingTemp = storeState.conversations.find((c) => c.id === tempId);
      if (!existingTemp) {
        storeState.conversations = [
          {
            id: tempId,
            name: opts.peerName || 'SofaYes',
            avatar: opts.peerAvatar || '',
            unreadCount: 0,
            peerUserId: opts.peerId,
            source: storeState.dataSource === 'cf-worker' ? 'cf-worker' : 'im-api',
          },
          ...storeState.conversations,
        ];
      }
      storeState.activeConvId = tempId;
    }
  }
  notifyStore();
  if (storeState.conversations.length === 0) {
    void prefetchSofaYesQuickChat();
  }
}

export function closeSofaYesQuickChat(): void {
  storeState.isOpen = false;
  storeState.composeOpen = false;
  notifyStore();
}

export function toggleSofaYesQuickChat(): void {
  if (storeState.isOpen) {
    closeSofaYesQuickChat();
  } else {
    openSofaYesQuickChat();
  }
}

export function getPendingDownloadRedirectFeature(): QuickChatMediaFeature | null {
  if (typeof window === 'undefined') return null;
  try {
    const val = sessionStorage.getItem(PENDING_DOWNLOAD_FEATURE_KEY);
    if (
      val === 'image' ||
      val === 'voice' ||
      val === 'video' ||
      val === 'attachment' ||
      val === 'call' ||
      val === 'expand'
    ) {
      return val;
    }
  } catch {}
  return null;
}

export function clearPendingDownloadRedirectFeature(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(PENDING_DOWNLOAD_FEATURE_KEY);
  } catch {}
}

// ---------------------------------------------------------------------------
// Zero-Dependency Crisp Inline Vector Icons
// ---------------------------------------------------------------------------

export function SofaYesLogoMark({
  size = 24,
  className = '',
  style,
}: {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 192 192"
      fill="none"
      aria-hidden="true"
      className={className}
      style={{ display: 'block', flexShrink: 0, ...style }}
    >
      <rect width="192" height="192" rx="44" fill="#000000" />
      <rect
        x="2"
        y="2"
        width="188"
        height="188"
        rx="42"
        stroke="#FFFFFF"
        strokeOpacity="0.18"
        strokeWidth="3"
      />
      <path fill="#FFFFFF" fillRule="evenodd" d={SOFAYES_WORDMARK_PATH} />
    </svg>
  );
}

function AvatarCircle({
  name,
  avatar,
  size = 48,
}: {
  name: string;
  avatar?: string;
  size?: number;
}) {
  const [imgError, setImgError] = useState(false);
  useEffect(() => {
    setImgError(false);
  }, [avatar]);

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '9999px',
        backgroundColor: '#2C2C2E',
        border: '1px solid rgba(255,255,255,0.08)',
        overflow: 'hidden',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}
    >
      {avatar && !imgError ? (
        <img
          src={avatar}
          alt={name}
          onError={() => setImgError(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      ) : (
        <svg
          width={Math.round(size * 0.62)}
          height={Math.round(size * 0.62)}
          viewBox="0 0 24 24"
          fill="#E5E5EA"
          aria-hidden="true"
        >
          <path d="M12 12c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm0 2c-3.33 0-10 1.67-10 5v2h20v-2c0-3.33-6.67-5-10-5z" />
        </svg>
      )}
    </div>
  );
}

function VerifiedSealIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <path
        d="M12 2L14.8 3.9L18.2 3.8L19.4 7L22 9.1L21 12.4L22 15.7L19.4 17.8L18.2 21L14.8 20.9L12 22.8L9.2 20.9L5.8 21L4.6 17.8L2 15.7L3 12.4L2 9.1L4.6 7L5.8 3.8L9.2 3.9L12 2Z"
        fill="#0A84FF"
      />
      <path
        d="M8.8 12.4L10.9 14.5L15.4 10"
        stroke="#FFFFFF"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ExpandIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 3h6v6" />
      <path d="M9 21H3v-6" />
      <path d="M21 3l-7 7" />
      <path d="M3 21l7-7" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

function BackIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

function ComposeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function ImageIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
      <path d="M19 10v2a7 7 0 01-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

function VideoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="23 7 16 12 23 17 23 7" />
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Trigger Button (SofaYes Logo + Red Unread Message Count)
// ---------------------------------------------------------------------------

export function SofaYesQuickChatTrigger({
  variant = 'icon-badge',
  locale,
  unreadOverride,
  label,
  tone = 'dark',
  size = 24,
  onClick,
  className = '',
  style,
  testId = 'sofayes-quick-chat-trigger',
}: SofaYesQuickChatTriggerProps) {
  const snap = useSyncExternalStore(subscribeStore, getStoreSnapshot, getStoreSnapshot);
  const resolvedLocale = detectHostLocale(locale);
  const c = COPY[resolvedLocale];

  useEffect(() => {
    ensureScopedStyles();
  }, []);

  const computedUnread = useMemo(() => {
    if (typeof unreadOverride === 'number') return Math.max(0, unreadOverride);
    if (typeof snap.unreadOverride === 'number') return Math.max(0, snap.unreadOverride);
    return snap.conversations.reduce(
      (acc, item) => acc + (item.isMuted ? 0 : Math.max(0, item.unreadCount)),
      0,
    );
  }, [snap.conversations, snap.unreadOverride, unreadOverride]);

  const badgeText = formatUnreadBadge(computedUnread);
  const handlePress = () => {
    if (onClick) {
      onClick();
    } else {
      toggleSofaYesQuickChat();
    }
  };

  if (variant === 'floating-pill') {
    return (
      <button
        type="button"
        data-testid={testId}
        onPointerDown={() => void prefetchSofaYesQuickChat({ locale: resolvedLocale })}
        onClick={handlePress}
        aria-label={`${label || c.messagesTitle}${badgeText ? ` (${badgeText})` : ''}`}
        className={`sfy-qc-root ${className}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '10px',
          height: '48px',
          padding: '0 16px 0 10px',
          borderRadius: '9999px',
          backgroundColor: '#121214',
          border: '1px solid rgba(255,255,255,0.14)',
          boxShadow: '0 14px 38px rgba(0,0,0,0.65)',
          color: '#FFFFFF',
          fontSize: '14px',
          fontWeight: 700,
          whiteSpace: 'nowrap',
          flexShrink: 0,
          cursor: 'pointer',
          transition: 'transform 160ms ease, background-color 160ms ease',
          ...style,
        }}
      >
        <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
          <SofaYesLogoMark size={28} />
        </span>
        <span style={{ whiteSpace: 'nowrap' }}>{label || c.messagesTitle}</span>
        {badgeText && (
          <span
            data-testid="sofayes-quick-chat-unread-badge"
            style={{
              minWidth: '20px',
              height: '20px',
              padding: '0 6px',
              borderRadius: '9999px',
              backgroundColor: '#FF3B30',
              color: '#FFFFFF',
              fontSize: '11px',
              fontWeight: 800,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontVariantNumeric: 'tabular-nums',
              flexShrink: 0,
            }}
          >
            {badgeText}
          </span>
        )}
      </button>
    );
  }

  if (variant === 'capsule-chip') {
    const isLight = tone === 'light';
    return (
      <button
        type="button"
        data-testid={testId}
        onPointerDown={() => void prefetchSofaYesQuickChat({ locale: resolvedLocale })}
        onClick={handlePress}
        aria-label={`${label || c.triggerLabel}${badgeText ? ` (${badgeText})` : ''}`}
        className={`sfy-qc-root ${className}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          height: '32px',
          padding: '0 10px 0 7px',
          borderRadius: '9999px',
          backgroundColor: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)',
          border: isLight
            ? '1px solid rgba(0,0,0,0.1)'
            : '1px solid rgba(255,255,255,0.12)',
          color: isLight ? '#111216' : '#FFFFFF',
          fontSize: '12px',
          fontWeight: 600,
          whiteSpace: 'nowrap',
          flexShrink: 0,
          cursor: 'pointer',
          ...style,
        }}
      >
        <SofaYesLogoMark size={18} />
        <span style={{ whiteSpace: 'nowrap' }}>{label || c.messagesTitle}</span>
        {badgeText && (
          <span
            data-testid="sofayes-quick-chat-unread-badge"
            style={{
              minWidth: '17px',
              height: '17px',
              padding: '0 5px',
              borderRadius: '9999px',
              backgroundColor: '#FF3B30',
              color: '#FFFFFF',
              fontSize: '10px',
              fontWeight: 800,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontVariantNumeric: 'tabular-nums',
              flexShrink: 0,
            }}
          >
            {badgeText}
          </span>
        )}
      </button>
    );
  }

  // Default: icon-badge (compact circular button for headers)
  const isLight = tone === 'light';
  const btnSize = Math.max(36, size + 14);
  return (
    <button
      type="button"
      data-testid={testId}
      onPointerDown={() => void prefetchSofaYesQuickChat({ locale: resolvedLocale })}
      onClick={handlePress}
      aria-label={`${label || c.triggerLabel}${badgeText ? ` (${badgeText})` : ''}`}
      title={label || c.triggerLabel}
      className={`sfy-qc-root ${className}`}
      style={{
        position: 'relative',
        width: `${btnSize}px`,
        height: `${btnSize}px`,
        borderRadius: '9999px',
        backgroundColor: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)',
        border: isLight
          ? '1px solid rgba(0,0,0,0.10)'
          : '1px solid rgba(255,255,255,0.12)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        whiteSpace: 'nowrap',
        cursor: 'pointer',
        ...style,
      }}
    >
      <SofaYesLogoMark size={size} />
      {badgeText && (
        <span
          data-testid="sofayes-quick-chat-unread-badge"
          style={{
            position: 'absolute',
            top: '-3px',
            right: '-4px',
            minWidth: '18px',
            height: '18px',
            padding: '0 5px',
            borderRadius: '9999px',
            backgroundColor: '#FF3B30',
            border: `2px solid ${isLight ? '#FFFFFF' : '#000000'}`,
            color: '#FFFFFF',
            fontSize: '10px',
            fontWeight: 800,
            lineHeight: 1,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontVariantNumeric: 'tabular-nums',
            pointerEvents: 'none',
          }}
        >
          {badgeText}
        </span>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main Quick-Chat Overlay Widget (Desktop Popover + Mobile 120Hz Bottom Sheet)
// ---------------------------------------------------------------------------

export function SofaYesQuickChatWidget({
  locale,
  downloadUrl = DEFAULT_DOWNLOAD_URL,
  onRedirectToDownloadApp,
  imApiBaseUrl,
  userId: explicitUserId,
  appId = 'matrix-app',
  hideFloatingTrigger = false,
  hideFloatingTriggerOnMobile = true,
  floatingPosition = 'bottom-right',
  externalConversations,
  externalUnreadCount,
  onFetchMessages,
  onSendTextMessage,
  onMarkConversationRead,
  onAnalyticsEvent,
}: SofaYesQuickChatWidgetProps) {
  const snap = useSyncExternalStore(subscribeStore, getStoreSnapshot, getStoreSnapshot);
  const resolvedLocale = detectHostLocale(locale);
  const c = COPY[resolvedLocale];
  const { userId, displayName } = useMemo(
    () => resolveActiveUser(explicitUserId),
    [explicitUserId],
  );

  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [draftText, setDraftText] = useState('');
  const [sending, setSending] = useState(false);
  const [localError, setLocalError] = useState<QuickChatErrorCode | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchContacts, setSearchContacts] = useState<
    Array<{ userId: string; displayName: string; avatar?: string; verified?: boolean }>
  >([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setMounted(true);
    ensureScopedStyles();
    const updateMedia = () => {
      setIsMobile(window.innerWidth < 768);
    };
    updateMedia();
    window.addEventListener('resize', updateMedia);
    return () => window.removeEventListener('resize', updateMedia);
  }, []);

  // Bridge external host conversations & unread count when provided
  useEffect(() => {
    if (typeof externalUnreadCount === 'number') {
      storeState.unreadOverride = externalUnreadCount;
      notifyStore();
    }
  }, [externalUnreadCount]);

  useEffect(() => {
    if (Array.isArray(externalConversations) && externalConversations.length > 0) {
      storeState.conversations = externalConversations.map((cItem) => ({
        ...cItem,
        source: cItem.source || 'host',
      }));
      storeState.dataSource = 'host';
      storeState.errorCode = null;
      notifyStore();
    }
  }, [externalConversations]);

  // Listen to cross-tab BroadcastChannel unread sync
  useEffect(() => {
    if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return;
    let ch: BroadcastChannel | null = null;
    try {
      ch = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      ch.onmessage = (ev) => {
        if (ev?.data?.type === 'QUICK_CHAT_SYNC' && Array.isArray(ev.data.conversations)) {
          if (!externalConversations) {
            storeState.conversations = ev.data.conversations;
            notifyStore(false);
          }
        }
      };
    } catch {}
    return () => {
      try {
        ch?.close();
      } catch {}
    };
  }, [externalConversations]);

  // Initial lightweight unread prefetch after idle
  useEffect(() => {
    if (!mounted || externalConversations) return;
    const timer = window.setTimeout(() => {
      void prefetchSofaYesQuickChat({
        imApiBaseUrl,
        userId,
        locale: resolvedLocale,
      });
    }, 350);
    return () => window.clearTimeout(timer);
  }, [mounted, externalConversations, imApiBaseUrl, userId, resolvedLocale]);

  // Refresh conversations when opened
  useEffect(() => {
    if (snap.isOpen) {
      onAnalyticsEvent?.('im.quick_chat.opened', {
        appId,
        totalUnread: snap.conversations.reduce((s, x) => s + x.unreadCount, 0),
      });
      if (!externalConversations) {
        void prefetchSofaYesQuickChat({
          imApiBaseUrl,
          userId,
          locale: resolvedLocale,
        });
      }
    }
  }, [snap.isOpen]);

  // Connect live CF WebSocket only if fallback CF room is active & widget is open
  useEffect(() => {
    if (!snap.isOpen || storeState.dataSource !== 'cf-worker') return;
    const wsUrl = `${DEFAULT_CF_WORKER_WS}/sofayes?room=${encodeURIComponent(DEFAULT_CF_ROOM)}&user=${encodeURIComponent(userId)}&name=${encodeURIComponent(displayName)}`;
    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      ws.onmessage = (evt) => {
        try {
          const payload = JSON.parse(String(evt.data || '{}'));
          const hubConvId = `cf-room-${DEFAULT_CF_ROOM}`;
          if (payload.type === 'init' && Array.isArray(payload.messages)) {
            setConvMessages(
              hubConvId,
              payload.messages.map((m: any) => ({
                id: String(m.id),
                senderId: String(m.sender_id || 'remote'),
                senderName: String(m.sender_name || m.sender_id || 'SofaYes'),
                type: 'TEXT',
                content: String(m.body || ''),
                createdAt: new Date(Number(m.created_at || Date.now())).toISOString(),
              })),
            );
            notifyStore();
          } else if (payload.type === 'chat_message' && payload.message) {
            const m = payload.message;
            const nextMsg: QuickChatMessageItem = {
              id: String(m.id),
              senderId: String(m.sender_id || 'remote'),
              senderName: String(m.sender_name || m.sender_id || 'SofaYes'),
              type: 'TEXT',
              content: String(m.body || ''),
              createdAt: new Date(Number(m.created_at || Date.now())).toISOString(),
            };
            const cur = storeState.messagesByConvId[hubConvId] || [];
            if (!cur.some((x) => x.id === nextMsg.id)) {
              setConvMessages(hubConvId, [...cur, nextMsg]);
              storeState.conversations = storeState.conversations.map((item) =>
                item.id === hubConvId
                  ? {
                      ...item,
                      lastMessageText: nextMsg.content,
                      lastMessageSenderIsSelf: nextMsg.senderId === userId,
                      updatedAt: nextMsg.createdAt,
                      unreadCount:
                        storeState.activeConvId === hubConvId ? 0 : item.unreadCount + 1,
                    }
                  : item,
              );
              notifyStore(true);
            }
          }
        } catch {}
      };
    } catch {}
    return () => {
      try {
        ws?.close();
      } catch {}
      if (wsRef.current === ws) wsRef.current = null;
    };
  }, [snap.isOpen, snap.dataSource, userId, displayName]);

  const activeConv = useMemo(
    () => snap.conversations.find((item) => item.id === snap.activeConvId) || null,
    [snap.conversations, snap.activeConvId],
  );

  const activeMessages = snap.activeConvId
    ? snap.messagesByConvId[snap.activeConvId] || []
    : [];

  const totalUnread = useMemo(() => {
    if (typeof externalUnreadCount === 'number') return Math.max(0, externalUnreadCount);
    return snap.conversations.reduce(
      (sum, item) => sum + (item.isMuted ? 0 : Math.max(0, item.unreadCount)),
      0,
    );
  }, [externalUnreadCount, snap.conversations]);

  const redirectToDownload = useCallback(
    (feature: QuickChatMediaFeature) => {
      try {
        sessionStorage.setItem(PENDING_DOWNLOAD_FEATURE_KEY, feature);
      } catch {}
      onAnalyticsEvent?.('im.quick_chat.media_redirect_download', {
        appId,
        feature,
      });
      closeSofaYesQuickChat();
      if (onRedirectToDownloadApp) {
        onRedirectToDownloadApp(feature, {
          conversationId: activeConv?.id,
          peerName: activeConv?.name,
        });
        return;
      }
      if (typeof window !== 'undefined') {
        try {
          const target = new URL(downloadUrl, window.location.origin);
          const isSameOrigin = target.origin === window.location.origin;
          if (isSameOrigin) {
            window.location.assign(target.pathname + target.search + target.hash);
          } else {
            target.hash = target.hash || '#media';
            window.location.assign(target.toString());
          }
        } catch {
          window.location.assign(downloadUrl);
        }
      }
    },
    [activeConv?.id, activeConv?.name, appId, downloadUrl, onAnalyticsEvent, onRedirectToDownloadApp],
  );

  const loadConversationMessages = useCallback(
    async (conv: QuickChatConversationItem) => {
      setLocalError(null);
      storeState.activeConvId = conv.id;
      // < 16ms Optimistic read reset
      if (conv.unreadCount > 0) {
        storeState.conversations = storeState.conversations.map((item) =>
          item.id === conv.id ? { ...item, unreadCount: 0 } : item,
        );
      }
      notifyStore(true);

      // Background mark read
      if (conv.unreadCount > 0) {
        if (onMarkConversationRead) {
          Promise.resolve(onMarkConversationRead(conv.id)).catch(() => {});
        } else if (storeState.activeImOrigin !== null && conv.source === 'im-api') {
          fetchWithTimeout(
            `${storeState.activeImOrigin}/api/im/conversations/${encodeURIComponent(conv.id)}/settings`,
            {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId, markRead: true }),
            },
          ).catch(() => {});
        }
      }

      if (onFetchMessages) {
        storeState.loadingMsgs = true;
        notifyStore();
        try {
          const items = await onFetchMessages(conv.id);
          setConvMessages(conv.id, items);
        } catch {
          setLocalError('ERR_IM_UNREACHABLE');
        } finally {
          storeState.loadingMsgs = false;
          notifyStore();
        }
        return;
      }

      if (conv.source === 'cf-worker') return;

      const origins =
        storeState.activeImOrigin !== null
          ? [storeState.activeImOrigin]
          : resolveCandidateImOrigins(imApiBaseUrl);

      // Resolve direct conversation if opened via peerId shortcut
      let resolvedConvId = conv.id;
      if (conv.id.startsWith('direct-') && conv.peerUserId && origins.length > 0) {
        for (const origin of origins) {
          try {
            const directRes = await fetchWithTimeout(
              `${origin}/api/im/conversations/direct`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, peerUserId: conv.peerUserId }),
              },
            );
            if (directRes.ok) {
              const dj = await directRes.json();
              if (dj?.conversation?.id) {
                resolvedConvId = String(dj.conversation.id);
                const mapped = mapImDtoToItem(dj.conversation, userId, resolvedLocale);
                storeState.conversations = storeState.conversations.map((item) =>
                  item.id === conv.id ? mapped : item,
                );
                storeState.activeConvId = resolvedConvId;
                storeState.activeImOrigin = origin;
                break;
              }
            }
          } catch {}
        }
      }

      storeState.loadingMsgs = true;
      notifyStore();
      for (const origin of origins) {
        try {
          const res = await fetchWithTimeout(
            `${origin}/api/im/conversations/${encodeURIComponent(resolvedConvId)}/messages?userId=${encodeURIComponent(userId)}&limit=40`,
            { cache: 'no-store' },
          );
          if (!res.ok) continue;
          const json = await res.json();
          if (json?.ok && Array.isArray(json.items)) {
            setConvMessages(
              resolvedConvId,
              json.items.map((m: any) => ({
                id: String(m.id),
                senderId: String(m.senderId),
                senderName: m.senderName ? String(m.senderName) : undefined,
                type: String(m.type || 'TEXT'),
                content: String(m.content || ''),
                createdAt: String(m.createdAt || new Date().toISOString()),
                status: m.status ? String(m.status) : undefined,
              })),
            );
            storeState.activeImOrigin = origin;
            storeState.loadingMsgs = false;
            notifyStore();
            return;
          }
        } catch {}
      }
      storeState.loadingMsgs = false;
      notifyStore();
    },
    [imApiBaseUrl, onFetchMessages, onMarkConversationRead, resolvedLocale, userId],
  );

  // Auto-scroll when messages arrive
  useEffect(() => {
    if (snap.activeConvId && activeMessages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [snap.activeConvId, activeMessages.length]);

  const handleSendText = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!activeConv || sending) return;
    const trimmed = draftText.trim();
    if (!trimmed) {
      setLocalError('ERR_IM_EMPTY_TEXT');
      return;
    }

    setLocalError(null);
    const optimisticId = `opt-${Date.now()}`;
    const nowIso = new Date().toISOString();
    const optimisticMsg: QuickChatMessageItem = {
      id: optimisticId,
      senderId: userId,
      senderName: displayName,
      type: 'TEXT',
      content: trimmed,
      createdAt: nowIso,
      status: 'SENDING',
    };

    const convId = activeConv.id;
    const prevMsgs = storeState.messagesByConvId[convId] || [];
    const prevConvs = storeState.conversations;

    // < 16ms Optimistic append
    setDraftText('');
    setConvMessages(convId, [...prevMsgs, optimisticMsg]);
    storeState.conversations = storeState.conversations.map((item) =>
      item.id === convId
        ? {
            ...item,
            lastMessageText: trimmed,
            lastMessageType: 'TEXT',
            lastMessageSenderIsSelf: true,
            updatedAt: nowIso,
            unreadCount: 0,
          }
        : item,
    );
    notifyStore(true);
    setSending(true);

    try {
      if (onSendTextMessage) {
        const real = await onSendTextMessage(convId, trimmed);
        if (real && real.id) {
          setConvMessages(
            convId,
            (storeState.messagesByConvId[convId] || []).map((m) =>
              m.id === optimisticId ? real : m,
            ),
          );
          notifyStore(true);
        }
      } else if (activeConv.source === 'cf-worker') {
        const ws = wsRef.current;
        if (!ws || ws.readyState !== WebSocket.OPEN) {
          throw new Error('ERR_IM_SEND_FAILED');
        }
        ws.send(
          JSON.stringify({
            type: 'chat_send',
            body: trimmed,
            senderName: displayName,
          }),
        );
      } else {
        const origin =
          storeState.activeImOrigin ?? resolveCandidateImOrigins(imApiBaseUrl)[0] ?? '';
        const res = await fetchWithTimeout(`${origin}/api/im/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversationId: convId,
            senderId: userId,
            type: 'TEXT',
            content: trimmed,
          }),
        });
        if (!res.ok) throw new Error('ERR_IM_SEND_FAILED');
        const json = await res.json();
        if (json?.ok && json.message) {
          const saved: QuickChatMessageItem = {
            id: String(json.message.id),
            senderId: String(json.message.senderId),
            senderName: json.message.senderName,
            type: 'TEXT',
            content: String(json.message.content),
            createdAt: String(json.message.createdAt || nowIso),
            status: 'SENT',
          };
          setConvMessages(
            convId,
            (storeState.messagesByConvId[convId] || []).map((m) =>
              m.id === optimisticId ? saved : m,
            ),
          );
          notifyStore(true);
        }
      }
      onAnalyticsEvent?.('im.quick_chat.text_sent', {
        appId,
        textLength: trimmed.length,
      });
    } catch {
      // Rollback optimistic message & restore draft
      setConvMessages(convId, prevMsgs);
      storeState.conversations = prevConvs;
      setDraftText(trimmed);
      setLocalError('ERR_IM_SEND_FAILED');
      notifyStore(true);
    } finally {
      setSending(false);
    }
  };

  // Search contacts for New Chat compose mode
  useEffect(() => {
    if (!snap.composeOpen) return;
    const q = searchQuery.trim();
    if (!q) {
      setSearchContacts([]);
      return;
    }
    const timer = window.setTimeout(async () => {
      const origins =
        storeState.activeImOrigin !== null
          ? [storeState.activeImOrigin]
          : resolveCandidateImOrigins(imApiBaseUrl);
      if (origins.length === 0) return;
      setSearchLoading(true);
      try {
        const res = await fetchWithTimeout(
          `${origins[0]}/api/im/search?userId=${encodeURIComponent(userId)}&q=${encodeURIComponent(q)}`,
        );
        if (res.ok) {
          const json = await res.json();
          const contacts = Array.isArray(json?.result?.contacts)
            ? json.result.contacts
            : [];
          setSearchContacts(
            contacts.slice(0, 12).map((u: any) => ({
              userId: String(u.userId || u.id),
              displayName: String(u.remarkName || u.displayName || u.handle || 'User'),
              avatar: u.avatar ? String(u.avatar) : '',
              verified: u.category === 'INSTITUTION' || u.category === 'MERCHANT',
            })),
          );
        }
      } catch {
        setLocalError('ERR_IM_SEARCH_FAILED');
      } finally {
        setSearchLoading(false);
      }
    }, 220);
    return () => window.clearTimeout(timer);
  }, [snap.composeOpen, searchQuery, imApiBaseUrl, userId]);

  const handlePasteOrDropFiles = (files?: FileList | null) => {
    if (!files || files.length === 0) return false;
    const first = files[0];
    const mime = (first?.type || '').toLowerCase();
    const feat: QuickChatMediaFeature = mime.startsWith('image/')
      ? 'image'
      : mime.startsWith('video/')
      ? 'video'
      : mime.startsWith('audio/')
      ? 'voice'
      : 'attachment';
    redirectToDownload(feat);
    return true;
  };

  const renderPanelHeader = (includeCloseButton: boolean) => {
    if (activeConv) {
      return (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            padding: '12px 14px',
            borderBottom: '1px solid var(--border-color)',
            backgroundColor: 'var(--bg-secondary)',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
            <button
              type="button"
              data-testid="quick-chat-back-btn"
              onClick={() => {
                storeState.activeConvId = null;
                setLocalError(null);
                notifyStore();
              }}
              aria-label={c.backLabel}
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '9999px',
                backgroundColor: 'var(--bg-tertiary)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                cursor: 'pointer',
              }}
            >
              <BackIcon />
            </button>
            <AvatarCircle name={activeConv.name} avatar={activeConv.avatar} size={32} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0 }}>
                <span
                  style={{
                    fontSize: '14px',
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {activeConv.name}
                </span>
                {activeConv.verified && <VerifiedSealIcon />}
              </div>
              <div
                style={{
                  fontSize: '10px',
                  color: 'var(--text-secondary)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {c.textOnlySubtitle}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            <button
              type="button"
              data-testid="quick-chat-voice-call-btn"
              onClick={() => redirectToDownload('call')}
              title={c.mediaCall}
              aria-label={c.mediaCall}
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '9999px',
                backgroundColor: 'var(--bg-tertiary)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                whiteSpace: 'nowrap',
                cursor: 'pointer',
              }}
            >
              <PhoneIcon />
            </button>
            <button
              type="button"
              data-testid="quick-chat-video-call-btn"
              onClick={() => redirectToDownload('video')}
              title={c.mediaVideo}
              aria-label={c.mediaVideo}
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '9999px',
                backgroundColor: 'var(--bg-tertiary)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                whiteSpace: 'nowrap',
                cursor: 'pointer',
              }}
            >
              <VideoIcon />
            </button>
            {includeCloseButton && (
              <button
                type="button"
                data-testid="quick-chat-close-btn"
                onClick={closeSofaYesQuickChat}
                aria-label={c.closeLabel}
                style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '9999px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: 'var(--text-primary)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  cursor: 'pointer',
                }}
              >
                <CloseIcon />
              </button>
            )}
          </div>
        </div>
      );
    }

    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
          padding: '14px 16px',
          borderBottom: '1px solid var(--border-color)',
          backgroundColor: 'var(--bg-secondary)',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
          <SofaYesLogoMark size={22} />
          <span
            style={{
              fontSize: '16px',
              fontWeight: 800,
              color: 'var(--text-primary)',
              letterSpacing: '-0.01em',
              whiteSpace: 'nowrap',
            }}
          >
            {c.messagesTitle}
          </span>
          {totalUnread > 0 && (
            <span
              data-testid="quick-chat-header-unread"
              style={{
                minWidth: '20px',
                height: '20px',
                padding: '0 6px',
                borderRadius: '9999px',
                backgroundColor: '#FF3B30',
                color: '#FFFFFF',
                fontSize: '12px',
                fontWeight: 800,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontVariantNumeric: 'tabular-nums',
                flexShrink: 0,
              }}
            >
              {formatUnreadBadge(totalUnread)}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <button
            type="button"
            data-testid="quick-chat-expand-download-btn"
            onClick={() => redirectToDownload('expand')}
            title={c.expandTitle}
            aria-label={c.expandTitle}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '9999px',
              backgroundColor: 'transparent',
              border: 'none',
              color: 'var(--text-primary)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              whiteSpace: 'nowrap',
              cursor: 'pointer',
            }}
          >
            <ExpandIcon />
          </button>
          {includeCloseButton && (
            <button
              type="button"
              data-testid="quick-chat-close-btn"
              onClick={closeSofaYesQuickChat}
              aria-label={c.closeLabel}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '9999px',
                backgroundColor: 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                cursor: 'pointer',
              }}
            >
              <CloseIcon />
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderPanelBody = () => {
    const activeErr = localError || snap.errorCode;

    if (activeConv) {
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            minHeight: 0,
            backgroundColor: 'var(--bg-primary)',
          }}
        >
          {/* Compact Text-Only Notice Strip */}
          <div
            onClick={() => redirectToDownload('expand')}
            style={{
              padding: '8px 12px',
              backgroundColor: 'rgba(16,185,129,0.09)',
              borderBottom: '1px solid rgba(16,185,129,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <span
              style={{
                fontSize: '11px',
                color: 'var(--text-primary)',
                lineHeight: 1.35,
              }}
            >
              {c.textOnlyNotice}
            </span>
            <span
              style={{
                padding: '3px 8px',
                borderRadius: '9999px',
                backgroundColor: '#10B981',
                color: '#000000',
                fontSize: '10px',
                fontWeight: 800,
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              {c.downloadChip}
            </span>
          </div>

          {activeErr && (
            <div
              data-testid="quick-chat-error-banner"
              style={{
                margin: '10px 12px 0',
                padding: '8px 10px',
                borderRadius: '12px',
                backgroundColor: 'rgba(255,59,48,0.14)',
                border: '1px solid rgba(255,59,48,0.35)',
                color: 'var(--text-primary)',
                fontSize: '12px',
                flexShrink: 0,
              }}
            >
              {c.errors[activeErr]}
            </div>
          )}

          {/* Messages Feed */}
          <div
            className="sfy-qc-noscrollbar"
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: 'auto',
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            {snap.loadingMsgs && activeMessages.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '12px', padding: '24px 0' }}>
                {c.loading}
              </div>
            ) : activeMessages.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '12px', padding: '28px 12px' }}>
                {c.emptyMessages}
              </div>
            ) : (
              activeMessages.map((msg) => {
                const isSelf = msg.senderId === userId;
                const upperType = String(msg.type || 'TEXT').toUpperCase();
                const isRichMedia = upperType !== 'TEXT' && upperType !== 'SYSTEM';
                const mediaFeature: QuickChatMediaFeature =
                  upperType === 'IMAGE'
                    ? 'image'
                    : upperType === 'VOICE'
                    ? 'voice'
                    : upperType === 'VIDEO'
                    ? 'video'
                    : upperType === 'CALL_LOG'
                    ? 'call'
                    : 'attachment';

                return (
                  <div
                    key={msg.id}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: isSelf ? 'flex-end' : 'flex-start',
                    }}
                  >
                    {isRichMedia ? (
                      <button
                        type="button"
                        data-testid={`quick-chat-media-msg-${msg.id}`}
                        onClick={() => redirectToDownload(mediaFeature)}
                        style={{
                          maxWidth: '82%',
                          textAlign: 'left',
                          padding: '10px 12px',
                          borderRadius: '16px',
                          backgroundColor: 'var(--bg-secondary)',
                          border: '1px solid var(--border-color)',
                          color: 'var(--text-primary)',
                          cursor: 'pointer',
                        }}
                      >
                        <div style={{ fontSize: '13px', fontWeight: 600 }}>
                          {upperType === 'IMAGE'
                            ? c.sentImage
                            : upperType === 'VOICE'
                            ? c.sentVoice
                            : upperType === 'VIDEO'
                            ? c.sentVideo
                            : c.sentAttachment}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--color-accent)', marginTop: '4px', fontWeight: 600 }}>
                          {c.mediaCardHint} →
                        </div>
                      </button>
                    ) : (
                      <div
                        style={{
                          maxWidth: '82%',
                          padding: '9px 13px',
                          borderRadius: '18px',
                          borderBottomRightRadius: isSelf ? '6px' : '18px',
                          borderBottomLeftRadius: isSelf ? '18px' : '6px',
                          backgroundColor: isSelf ? '#10B981' : 'var(--bg-secondary)',
                          color: isSelf ? '#000000' : 'var(--text-primary)',
                          fontSize: '13.5px',
                          fontWeight: isSelf ? 600 : 400,
                          lineHeight: 1.45,
                          wordBreak: 'break-word',
                          border: isSelf ? 'none' : '1px solid var(--border-color)',
                        }}
                      >
                        {msg.content}
                      </div>
                    )}
                    <span style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '3px', padding: '0 4px' }}>
                      {formatRelativeTime(msg.createdAt, resolvedLocale)}
                    </span>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Text-Only Composer + Media Redirect Buttons */}
          <form
            onSubmit={handleSendText}
            onDrop={(e) => {
              if (e.dataTransfer?.files?.length) {
                e.preventDefault();
                handlePasteOrDropFiles(e.dataTransfer.files);
              }
            }}
            onDragOver={(e) => e.preventDefault()}
            style={{
              padding: '10px 12px',
              paddingBottom: isMobile ? '8px' : '12px',
              backgroundColor: 'var(--bg-secondary)',
              borderTop: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              flexShrink: 0,
            }}
          >
            {/* Row 1: Text Input + Send (Strict max <= 2 buttons on mobile) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                ref={inputRef}
                type="text"
                data-testid="quick-chat-text-input"
                value={draftText}
                onChange={(e) => setDraftText(e.target.value)}
                onPaste={(e) => {
                  if (e.clipboardData?.files?.length) {
                    e.preventDefault();
                    handlePasteOrDropFiles(e.clipboardData.files);
                  }
                }}
                placeholder={c.inputPlaceholder}
                style={{
                  flex: 1,
                  minWidth: 0,
                  height: '38px',
                  borderRadius: '9999px',
                  backgroundColor: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                  padding: '0 14px',
                  color: 'var(--text-primary)',
                  fontSize: '13.5px',
                  outline: 'none',
                }}
              />
              <button
                type="submit"
                data-testid="quick-chat-send-btn"
                disabled={sending}
                style={{
                  height: '38px',
                  padding: '0 14px',
                  borderRadius: '9999px',
                  backgroundColor: draftText.trim() ? '#10B981' : 'var(--bg-tertiary)',
                  color: draftText.trim() ? '#000000' : 'var(--text-secondary)',
                  border: draftText.trim() ? 'none' : '1px solid var(--border-color)',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  cursor: 'pointer',
                }}
              >
                <SendIcon />
                <span>{c.sendLabel}</span>
              </button>
            </div>

            {/* Row 2: Media Redirect Strip (2 columns on mobile so <= 2 buttons per row!) */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? 'repeat(2, minmax(0, 1fr))' : 'repeat(4, minmax(0, 1fr))',
                gap: '6px',
              }}
            >
              {(
                [
                  { id: 'image', label: c.mediaImage, icon: <ImageIcon /> },
                  { id: 'voice', label: c.mediaVoice, icon: <MicIcon /> },
                  { id: 'video', label: c.mediaVideo, icon: <VideoIcon /> },
                  { id: 'attachment', label: c.mediaAttachment, icon: <PlusIcon /> },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  data-testid={`quick-chat-media-${item.id}`}
                  onClick={() => redirectToDownload(item.id)}
                  style={{
                    height: '30px',
                    padding: '0 8px',
                    borderRadius: '9999px',
                    backgroundColor: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '5px',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    cursor: 'pointer',
                  }}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </form>
        </div>
      );
    }

    // Conversation List / New Chat Search View
    return (
      <div
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          minHeight: 0,
          backgroundColor: 'var(--bg-secondary)',
        }}
      >
        {snap.composeOpen && (
          <div
            style={{
              padding: '10px 14px',
              borderBottom: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              flexShrink: 0,
            }}
          >
            <input
              type="text"
              data-testid="quick-chat-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={c.searchPlaceholder}
              autoFocus
              style={{
                flex: 1,
                minWidth: 0,
                height: '34px',
                borderRadius: '9999px',
                backgroundColor: 'var(--bg-tertiary)',
                border: '1px solid var(--border-color)',
                padding: '0 12px',
                color: 'var(--text-primary)',
                fontSize: '13px',
                outline: 'none',
              }}
            />
            <button
              type="button"
              onClick={() => {
                storeState.composeOpen = false;
                setSearchQuery('');
                notifyStore();
              }}
              style={{
                height: '34px',
                padding: '0 12px',
                borderRadius: '9999px',
                backgroundColor: 'var(--bg-tertiary)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                fontSize: '12px',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                flexShrink: 0,
                cursor: 'pointer',
              }}
            >
              {c.closeLabel.slice(0, 2) === '关闭' ? '取消' : 'Cancel'}
            </button>
          </div>
        )}

        {activeErr && (
          <div
            data-testid="quick-chat-error-banner"
            style={{
              margin: '12px 14px 4px',
              padding: '10px 12px',
              borderRadius: '14px',
              backgroundColor: 'rgba(255,59,48,0.14)',
              border: '1px solid rgba(255,59,48,0.32)',
              color: '#FFD2CF',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              flexShrink: 0,
            }}
          >
            <span>{c.errors[activeErr]}</span>
            <button
              type="button"
              onClick={() =>
                void prefetchSofaYesQuickChat({
                  imApiBaseUrl,
                  userId,
                  locale: resolvedLocale,
                })
              }
              style={{
                padding: '4px 10px',
                borderRadius: '9999px',
                backgroundColor: '#FF3B30',
                color: '#FFFFFF',
                fontSize: '11px',
                fontWeight: 700,
                border: 'none',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                cursor: 'pointer',
              }}
            >
              {c.retry}
            </button>
          </div>
        )}

        <div
          className="sfy-qc-noscrollbar"
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            padding: '6px 8px 76px',
          }}
        >
          {snap.composeOpen && searchQuery.trim() && (
            <div style={{ marginBottom: '8px' }}>
              {searchLoading ? (
                <div style={{ padding: '12px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {c.loading}
                </div>
              ) : (
                searchContacts.map((contact) => (
                  <button
                    key={contact.userId}
                    type="button"
                    onClick={() => {
                      storeState.composeOpen = false;
                      setSearchQuery('');
                      void loadConversationMessages({
                        id: `direct-${contact.userId}`,
                        name: contact.displayName,
                        avatar: contact.avatar,
                        verified: contact.verified,
                        unreadCount: 0,
                        peerUserId: contact.userId,
                        source: 'im-api',
                      });
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 10px',
                      borderRadius: '14px',
                      backgroundColor: 'transparent',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                  >
                    <AvatarCircle name={contact.displayName} avatar={contact.avatar} size={42} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {contact.displayName}
                        </span>
                        {contact.verified && <VerifiedSealIcon />}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {c.tapToChat}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}

          {snap.loadingConvs && snap.conversations.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text-secondary)', fontSize: '13px' }}>
              {c.loading}
            </div>
          ) : snap.conversations.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text-secondary)', fontSize: '13px' }}>
              {c.emptyConversations}
            </div>
          ) : (
            snap.conversations
              .filter((item) =>
                !searchQuery.trim()
                  ? true
                  : item.name.toLowerCase().includes(searchQuery.trim().toLowerCase()),
              )
              .map((conv) => {
                const rel = formatRelativeTime(conv.updatedAt, resolvedLocale);
                const hasText = Boolean(conv.lastMessageText && conv.lastMessageText.trim());
                const preview = hasText
                  ? `${conv.lastMessageSenderIsSelf ? c.selfPrefix : ''}${conv.lastMessageText}`
                  : c.tapToChat;
                const isUnread = conv.unreadCount > 0;

                return (
                  <button
                    key={conv.id}
                    type="button"
                    data-testid={`quick-chat-row-${conv.id}`}
                    onClick={() => void loadConversationMessages(conv)}
                    style={{
                      width: '100%',
                      padding: '10px 10px',
                      borderRadius: '14px',
                      backgroundColor: 'transparent',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'background-color 140ms ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <AvatarCircle name={conv.name} avatar={conv.avatar} size={48} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', minWidth: 0 }}>
                        <span
                          style={{
                            fontSize: '14.5px',
                            fontWeight: isUnread ? 700 : 600,
                            color: 'var(--text-primary)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {conv.name}
                        </span>
                        {conv.verified && <VerifiedSealIcon />}
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          marginTop: '3px',
                          fontSize: '13px',
                          color: isUnread ? 'var(--text-primary)' : 'var(--text-secondary)',
                          fontWeight: isUnread ? 600 : 400,
                          minWidth: 0,
                        }}
                      >
                        <span
                          style={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            minWidth: 0,
                          }}
                        >
                          {preview}
                        </span>
                        {rel && (
                          <span
                            style={{
                              color: 'var(--text-secondary)',
                              fontWeight: 400,
                              whiteSpace: 'nowrap',
                              flexShrink: 0,
                            }}
                          >
                            · {rel}
                          </span>
                        )}
                      </div>
                    </div>
                    {isUnread && (
                      <span
                        data-testid={`quick-chat-row-unread-${conv.id}`}
                        style={{
                          width: '9px',
                          height: '9px',
                          borderRadius: '9999px',
                          backgroundColor: '#3B82F6',
                          flexShrink: 0,
                        }}
                      />
                    )}
                  </button>
                );
              })
          )}
        </div>

        {/* Bottom-right floating New Text Chat Compose Button (matches reference screenshot) */}
        <button
          type="button"
          data-testid="quick-chat-compose-btn"
          onClick={() => {
            storeState.composeOpen = !storeState.composeOpen;
            notifyStore();
          }}
          aria-label={c.newChatLabel}
          title={c.newChatLabel}
          style={{
            position: 'absolute',
            right: '16px',
            bottom: isMobile ? 'max(env(safe-area-inset-bottom, 0px), 16px)' : '16px',
            width: '48px',
            height: '48px',
            borderRadius: '9999px',
            backgroundColor: 'var(--bg-tertiary)',
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--glass-shadow, 0 10px 26px rgba(0,0,0,0.35))',
            color: 'var(--text-primary)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <ComposeIcon />
        </button>
      </div>
    );
  };

  if (!mounted) return null;

  const showFloating =
    !hideFloatingTrigger &&
    !(isMobile && hideFloatingTriggerOnMobile) &&
    !snap.isOpen;

  return (
    <>
      {showFloating &&
        createPortal(
          <div
            data-testid="sofayes-quick-chat-floating-dock"
            style={{
              position: 'fixed',
              bottom: 'max(env(safe-area-inset-bottom, 0px), 20px)',
              right: floatingPosition === 'bottom-right' ? '20px' : undefined,
              left: floatingPosition === 'bottom-left' ? '20px' : undefined,
              zIndex: 9850,
            }}
          >
            <SofaYesQuickChatTrigger
              variant="floating-pill"
              locale={resolvedLocale}
              unreadOverride={totalUnread}
            />
          </div>,
          document.body,
        )}

      {/* Desktop Floating Card */}
      {snap.isOpen &&
        !isMobile &&
        createPortal(
          <div
            role="dialog"
            aria-modal="false"
            data-testid="sofayes-quick-chat-panel"
            className="sfy-qc-root"
            style={{
              position: 'fixed',
              bottom: '20px',
              right: floatingPosition === 'bottom-right' ? '20px' : undefined,
              left: floatingPosition === 'bottom-left' ? '20px' : undefined,
              width: '376px',
              maxWidth: 'calc(100vw - 24px)',
              height: '540px',
              maxHeight: 'calc(100vh - 88px)',
              zIndex: 9900,
              borderRadius: '22px',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              boxShadow: 'var(--glass-shadow, 0 24px 64px rgba(0,0,0,0.45))',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              overscrollBehavior: 'none',
            }}
          >
            {renderPanelHeader(true)}
            <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
              {renderPanelBody()}
            </div>
          </div>,
          document.body,
        )}

      {/* Mobile 120Hz Physics Bottom Sheet */}
      {isMobile && (
        <InteractiveBottomSheet
          open={snap.isOpen}
          onClose={closeSofaYesQuickChat}
          snapPoints={[0.88]}
          initialSnap={0}
          testId="sofayes-quick-chat-mobile-sheet"
          closeButtonTestId="quick-chat-mobile-close-btn"
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <SofaYesLogoMark size={20} />
              <span>{activeConv ? activeConv.name : c.messagesTitle}</span>
              {!activeConv && totalUnread > 0 && (
                <span
                  style={{
                    minWidth: '19px',
                    height: '19px',
                    padding: '0 6px',
                    borderRadius: '9999px',
                    backgroundColor: '#FF3B30',
                    color: '#FFFFFF',
                    fontSize: '11px',
                    fontWeight: 800,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {formatUnreadBadge(totalUnread)}
                </span>
              )}
            </div>
          }
          subtitle={activeConv ? c.textOnlySubtitle : undefined}
        >
          <div
            className="sfy-qc-root"
            style={{
              height: '100%',
              minHeight: 0,
              margin: '0 -18px',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {activeConv && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  padding: '8px 14px',
                  borderBottom: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-secondary)',
                  flexShrink: 0,
                }}
              >
                <button
                  type="button"
                  data-testid="quick-chat-mobile-back-btn"
                  onClick={() => {
                    storeState.activeConvId = null;
                    setLocalError(null);
                    notifyStore();
                  }}
                  style={{
                    height: '30px',
                    padding: '0 10px',
                    borderRadius: '9999px',
                    backgroundColor: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    fontSize: '12px',
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    cursor: 'pointer',
                  }}
                >
                  <BackIcon />
                  <span>{c.backLabel}</span>
                </button>
                <button
                  type="button"
                  data-testid="quick-chat-voice-call-btn"
                  onClick={() => redirectToDownload('call')}
                  style={{
                    height: '30px',
                    padding: '0 10px',
                    borderRadius: '9999px',
                    backgroundColor: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    cursor: 'pointer',
                  }}
                >
                  <PhoneIcon />
                  <span>{c.mediaCall}</span>
                </button>
              </div>
            )}
            <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
              {renderPanelBody()}
            </div>
          </div>
        </InteractiveBottomSheet>
      )}
    </>
  );
}
