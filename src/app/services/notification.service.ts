import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message: string;
  progress: number; // 0-100, drives the progress bar
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private _toasts$ = new BehaviorSubject<Toast[]>([]);
  readonly toasts$ = this._toasts$.asObservable();

  private show(type: ToastType, title: string, message: string, duration = 4500) {
    const id = Math.random().toString(36).slice(2, 9);
    const toast: Toast = { id, type, title, message, progress: 100 };

    this._toasts$.next([...this._toasts$.value, toast]);

    // Animate progress bar down
    const interval = 30;
    const steps = duration / interval;
    const decrement = 100 / steps;
    let current = 100;
    const timer = setInterval(() => {
      current -= decrement;
      this._toasts$.next(
        this._toasts$.value.map(t =>
          t.id === id ? { ...t, progress: Math.max(0, current) } : t
        )
      );
    }, interval);

    setTimeout(() => {
      clearInterval(timer);
      this.dismiss(id);
    }, duration);
  }

  success(message: string, title = 'Éxito') {
    this.show('success', title, message);
  }

  error(message: string, title = 'Error') {
    this.show('error', title, message, 6000);
  }

  warning(message: string, title = 'Advertencia') {
    this.show('warning', title, message);
  }

  info(message: string, title = 'Información') {
    this.show('info', title, message);
  }

  dismiss(id: string) {
    this._toasts$.next(this._toasts$.value.filter(t => t.id !== id));
  }
}
