/**
 * HoneyShield X Mobile — Ambient Declarations for Native & Expo Libraries
 * Ensures standalone compilation integrity and static type validation.
 */

declare module 'react-native' {
  export const Platform: {
    OS: 'ios' | 'android' | 'web' | 'windows' | 'macos';
    select: <T>(specifics: { [platform: string]: any; default?: any }) => T;
  };

  export interface ViewStyle {
    [key: string]: any;
  }
  export interface TextStyle {
    [key: string]: any;
  }
  export interface ImageStyle {
    [key: string]: any;
  }

  export const View: any;
  export const Text: any;
  export const TextInput: any;
  export const TouchableOpacity: any;
  export const ScrollView: any;
  export const FlatList: any;
  export const ActivityIndicator: any;
  export const Modal: any;
  export const Switch: any;
  export const KeyboardAvoidingView: any;
  export const RefreshControl: any;
  export const Alert: {
    alert: (title: string, message?: string, buttons?: any[]) => void;
  };

  export const StyleSheet: {
    create: <T extends Record<string, any>>(styles: T) => T;
  };
}

declare module 'react-native-safe-area-context' {
  export const SafeAreaProvider: any;
  export const SafeAreaView: any;
  export const useSafeAreaInsets: () => { top: number; right: number; bottom: number; left: number };
}

declare module 'expo-status-bar' {
  export const StatusBar: any;
}

declare module 'expo-secure-store' {
  export const WHEN_UNLOCKED_THIS_DEVICE_ONLY: string;
  export function setItemAsync(key: string, value: string, options?: any): Promise<void>;
  export function getItemAsync(key: string): Promise<string | null>;
  export function deleteItemAsync(key: string): Promise<void>;
}

declare module 'expo-local-authentication' {
  export function hasHardwareAsync(): Promise<boolean>;
  export function isEnrolledAsync(): Promise<boolean>;
  export interface LocalAuthenticationResult {
    success: boolean;
    error?: string;
  }
  export function authenticateAsync(options?: any): Promise<LocalAuthenticationResult>;
}

declare module 'expo-notifications' {
  export function getExpoPushTokenAsync(options?: any): Promise<{ data: string }>;
  export function requestPermissionsAsync(): Promise<{ status: string }>;
}

declare module 'expo' {
  export function registerRootComponent(component: any): void;
}

declare module 'lucide-react-native' {
  export const Shield: any;
  export const ShieldAlert: any;
  export const ShieldCheck: any;
  export const ShieldOff: any;
  export const Lock: any;
  export const User: any;
  export const UserX: any;
  export const Server: any;
  export const Fingerprint: any;
  export const AlertTriangle: any;
  export const AlertCircle: any;
  export const Key: any;
  export const KeyRound: any;
  export const Radio: any;
  export const Activity: any;
  export const Flame: any;
  export const ChevronRight: any;
  export const TrendingUp: any;
  export const Filter: any;
  export const Search: any;
  export const Terminal: any;
  export const Crosshair: any;
  export const Plus: any;
  export const Globe2: any;
  export const Database: any;
  export const ExternalLink: any;
  export const Briefcase: any;
  export const CheckSquare: any;
  export const Square: any;
  export const FileText: any;
  export const RotateCw: any;
  export const Power: any;
  export const Cpu: any;
  export const CheckCircle2: any;
  export const Settings: any;
  export const LogOut: any;
  export const Info: any;
  export const X: any;
  export const Calendar: any;
}

declare module '@react-navigation/native' {
  export const NavigationContainer: any;
  export type NavigatorScreenParams<T> = any;
}

declare module '@react-navigation/native-stack' {
  export function createNativeStackNavigator<T = any>(): {
    Navigator: any;
    Screen: any;
  };
}

declare module '@react-navigation/bottom-tabs' {
  export function createBottomTabNavigator<T = any>(): {
    Navigator: any;
    Screen: any;
  };
}

declare module 'axios' {
  export interface AxiosRequestConfig {
    [key: string]: any;
  }
  export interface InternalAxiosRequestConfig extends AxiosRequestConfig {
    headers: any;
    baseURL?: string;
  }
  export interface AxiosResponse<T = any> {
    data: T;
    status: number;
    statusText: string;
    headers: any;
    config: any;
  }
  export interface AxiosError<T = any> extends Error {
    config?: any;
    code?: string;
    request?: any;
    response?: AxiosResponse<T>;
    isAxiosError: boolean;
  }
  export interface AxiosInstance {
    (config: AxiosRequestConfig): Promise<AxiosResponse>;
    get<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
    delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
    post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
    put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
    patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
    interceptors: {
      request: {
        use(
          onFulfilled?: (value: InternalAxiosRequestConfig) => InternalAxiosRequestConfig | Promise<InternalAxiosRequestConfig>,
          onRejected?: (error: any) => any
        ): number;
      };
      response: {
        use(
          onFulfilled?: (value: AxiosResponse) => AxiosResponse | Promise<AxiosResponse>,
          onRejected?: (error: any) => any
        ): number;
      };
    };
  }
  const axios: {
    create(config?: AxiosRequestConfig): AxiosInstance;
  };
  export default axios;
}

declare module 'zustand' {
  export type StateCreator<T> = (
    set: (partial: T | Partial<T> | ((state: T) => T | Partial<T>), replace?: boolean) => void,
    get: () => T,
    api: any
  ) => T;
  export function create<T>(initializer: StateCreator<T>): {
    (): T;
    <U>(selector: (state: T) => U): U;
    getState: () => T;
    setState: (partial: T | Partial<T> | ((state: T) => T | Partial<T>), replace?: boolean) => void;
    subscribe: (listener: (state: T, prevState: T) => void) => () => void;
  };
}
