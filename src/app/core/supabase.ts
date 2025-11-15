import { Injectable } from '@angular/core';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase: SupabaseClient;
  private currentUser: BehaviorSubject<User | null> = new BehaviorSubject<User | null>(null);

  constructor() {
    this.supabase = createClient(
      environment.supabase.url,
      environment.supabase.key
    );


    //SERVICIOS PARA EL TAB 1

    // Verificar sesión actual
    this.supabase.auth.getSession().then(({ data: { session } }) => {
      this.currentUser.next(session?.user ?? null);
    });

    // Escuchar cambios de autenticación
    this.supabase.auth.onAuthStateChange((event, session) => {
      this.currentUser.next(session?.user ?? null);
    });
  }

  get user$(): Observable<User | null> {
    return this.currentUser.asObservable();
  }

  get userId(): string | undefined {
    return this.currentUser.value?.id;
  }

  // Registro de usuario
  async signUp(email: string, password: string, role: string) {
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role
        }
      }
    });
    if (error) throw error;
    return data;
  }

  // Inicio de sesión
  async signIn(email: string, password: string) {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error) throw error;
    return data;
  }

  // Cerrar sesión
  async signOut() {
    const { error } = await this.supabase.auth.signOut();
    if (error) throw error;
  }

  // Obtener perfil del usuario
  async getProfile(userId: string) {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (error) throw error;
    return data;
  }

  // Obtener rol del usuario actual
  async getCurrentUserRole(): Promise<string | null> {
    const userId = this.userId;
    if (!userId) return null;

    const profile = await this.getProfile(userId);
    return profile?.role ?? null;
  }

  async getCurrentUser() {
    const { data: { user } } = await this.supabase.auth.getUser();
    return user;
  }

  //SERVICIOS PARA EL TAB 2
  // Subir imagen a Supabase Storage
  async uploadImage(file: Blob, userId: string, tipo: 'medidor' | 'fachada'): Promise<string> {
    const fileName = `${userId}/${tipo}_${Date.now()}.jpg`;
    const { data, error } = await this.supabase.storage
      .from('medidores-fotos')
      .upload(fileName, file, {
        contentType: 'image/jpeg',
        upsert: false
      });

    if (error) throw error;

    // Obtener URL pública de la imagen
    const { data: urlData } = this.supabase.storage
      .from('medidores-fotos')
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  }

  // Crear nueva lectura
  async createLectura(lectura: {
    foto_medidor: string;
    foto_fachada: string;
    valor_medidor: number;
    observaciones: string;
    latitud: number;
    longitud: number;
  }) {
    const userId = this.userId;
    if (!userId) throw new Error('Usuario no autenticado');

    const { data, error } = await this.supabase
      .from('lecturas')
      .insert([
        {
          user_id: userId,
          ...lectura
        }
      ])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Obtener lecturas del usuario actual
  async getMisLecturas() {
    const userId = this.userId;
    if (!userId) throw new Error('Usuario no autenticado');

    const { data, error } = await this.supabase
      .from('lecturas')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  // Obtener todas las lecturas (solo administradores)
  async getTodasLasLecturas() {
    const { data, error } = await this.supabase
      .from('lecturas')
      .select(`
        *,
        profiles:user_id (email, role)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }
}