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
      environment.supabase.key,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        }
      }
    );

    this.initializeAuth();

    this.supabase.auth.onAuthStateChange((event, session) => {
      this.currentUser.next(session?.user ?? null);
    });
  }

  private async initializeAuth() {
    const { data: { session } } = await this.supabase.auth.getSession();
    this.currentUser.next(session?.user ?? null);
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
    
    // Insertar manualmente en la tabla users
    if (data.user) {
      const { error: insertError } = await this.supabase
        .from('users')
        .insert([{
          id: data.user.id,
          email: data.user.email,
          role: role
        }]);
      
      if (insertError && insertError.code !== '23505') {
        console.error('Error al insertar en users:', insertError);
      }
    }
    
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
    this.currentUser.next(null);
    if (error) throw error;
  }

  // Obtener usuario de la tabla users
  async getUserFromTable(userId: string) {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) {
      console.error('Error al obtener usuario:', error);
      return null;
    }
    return data;
  }

  // Obtener rol del usuario actual
  async getCurrentUserRole(): Promise<string | null> {
    try {
      const user = await this.getCurrentUser();
      if (!user) return null;

      const userData = await this.getUserFromTable(user.id);
      return userData?.role ?? 'medidor';
    } catch (error) {
      console.error('Error al obtener rol:', error);
      return 'medidor';
    }
  }

  async getCurrentUser() {
    const { data: { user } } = await this.supabase.auth.getUser();
    return user;
  }

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

    const { data: urlData } = this.supabase.storage
      .from('medidores-fotos')
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  }

  // Crear nueva lectura en la tabla readings
  async createLectura(lectura: {
    meter_photo_url?: string;
    facade_photo_url?: string;
    meter_value: number;
    observations: string;
    latitude: number;
    longitude: number;
  }) {
    const userId = this.userId;
    if (!userId) throw new Error('Usuario no autenticado');

    // Verificar si el usuario existe en la tabla users
    const { data: userData, error: userError } = await this.supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (userError || !userData) {
      console.log('Usuario no existe en tabla users, creándolo...');
      const currentUser = await this.getCurrentUser();
      
      if (currentUser) {
        const userMetadata = currentUser.user_metadata as { role?: string };
        const userRole = userMetadata?.['role'] || 'medidor';
        
        const { data: newUser, error: insertError } = await this.supabase
          .from('users')
          .insert([{
            id: currentUser.id,
            email: currentUser.email,
            role: userRole
          }])
          .select()
          .single();
        
        if (insertError) {
          console.error('Error al crear usuario en tabla:', insertError);
          throw new Error('No se pudo crear el usuario en la tabla users');
        }
        
        console.log('Usuario creado:', newUser);
      } else {
        throw new Error('No se pudo obtener el usuario actual');
      }
    } else {
      console.log('Usuario encontrado:', userData);
    }

    // Insertar la lectura
    const { data, error } = await this.supabase
      .from('readings')
      .insert([
        {
          user_id: userId,
          meter_photo_url: lectura.meter_photo_url,
          facade_photo_url: lectura.facade_photo_url,
          meter_value: lectura.meter_value,
          observations: lectura.observations,
          latitude: lectura.latitude,
          longitude: lectura.longitude
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Error al insertar datos:', error);
      throw error;
    }
    
    console.log('Datos guardados:', data);
    return data;
  }

  // Obtener lecturas del usuario actual
  async getMisLecturas() {
    const userId = this.userId;
    if (!userId) throw new Error('Usuario no autenticado');

    const userData = await this.getUserFromTable(userId);
    if (!userData) throw new Error('Usuario no encontrado');

    const { data, error } = await this.supabase
      .from('readings')
      .select('*')
      .eq('user_id', userData.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  // Obtener el rol del usuario actual
  async getUserRole() {
    try {
      const user = await this.getCurrentUser();
      if (!user) return null;

      const { data, error } = await this.supabase
        .from('users')
        .select('id, email, role')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error al obtener rol del usuario:', error);
      return null;
    }
  }

  // Obtener todas las lecturas (para admin)
  async getTodasLasLecturas() {
    const { data, error } = await this.supabase
      .from('readings')
      .select(`
        *,
        users (
          email,
          role
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  // Obtener lecturas de un usuario específico (para medidor)
  async getLecturasPorUsuario(userId: string) {
    const { data, error } = await this.supabase
      .from('readings')
      .select(`
        *,
        users (
          email,
          role
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }
}