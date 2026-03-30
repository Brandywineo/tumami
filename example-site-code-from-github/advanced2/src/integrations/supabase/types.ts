export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      admin_notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          priority: string
          related_entity_id: string | null
          related_entity_type: string | null
          related_user_id: string | null
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          priority?: string
          related_entity_id?: string | null
          related_entity_type?: string | null
          related_user_id?: string | null
          title: string
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          priority?: string
          related_entity_id?: string | null
          related_entity_type?: string | null
          related_user_id?: string | null
          title?: string
          type?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          details: Json | null
          id: string
          target_id: string | null
          target_type: string
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          details?: Json | null
          id?: string
          target_id?: string | null
          target_type?: string
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          target_id?: string | null
          target_type?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          last_message_at: string | null
          participant_1: string
          participant_2: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          participant_1: string
          participant_2: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          participant_1?: string
          participant_2?: string
        }
        Relationships: []
      }
      disputes: {
        Row: {
          against_user_id: string | null
          created_at: string
          dispute_type: string
          errand_id: string
          escalated_at: string | null
          escalation_deadline: string | null
          id: string
          opened_by_user_id: string
          reason: string
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
        }
        Insert: {
          against_user_id?: string | null
          created_at?: string
          dispute_type?: string
          errand_id: string
          escalated_at?: string | null
          escalation_deadline?: string | null
          id?: string
          opened_by_user_id: string
          reason?: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Update: {
          against_user_id?: string | null
          created_at?: string
          dispute_type?: string
          errand_id?: string
          escalated_at?: string | null
          escalation_deadline?: string | null
          id?: string
          opened_by_user_id?: string
          reason?: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      errand_status_history: {
        Row: {
          changed_by: string | null
          created_at: string
          errand_id: string
          id: string
          status: Database["public"]["Enums"]["errand_status"]
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          errand_id: string
          id?: string
          status: Database["public"]["Enums"]["errand_status"]
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          errand_id?: string
          id?: string
          status?: Database["public"]["Enums"]["errand_status"]
        }
        Relationships: [
          {
            foreignKeyName: "errand_status_history_errand_id_fkey"
            columns: ["errand_id"]
            isOneToOne: false
            referencedRelation: "errands"
            referencedColumns: ["id"]
          },
        ]
      }
      errands: {
        Row: {
          area_type: string | null
          base_amount: number
          created_at: string
          customer_id: string
          delivery_location: string | null
          description: string | null
          dropoff_location: string | null
          errand_payment_status: string | null
          estimated_duration_minutes: number | null
          id: string
          merchant_payment_note: string | null
          notes: string | null
          payment_method: string | null
          pickup_location: string | null
          platform_fee: number
          preferred_date: string | null
          preferred_runner_id: string | null
          recipient_name: string | null
          recipient_phone: string | null
          runner_id: string | null
          runner_payout: number
          service_category: string | null
          service_type: string
          status: Database["public"]["Enums"]["errand_status"]
          title: string
          total_amount: number
          transaction_fee_amount: number
          updated_at: string
        }
        Insert: {
          area_type?: string | null
          base_amount?: number
          created_at?: string
          customer_id: string
          delivery_location?: string | null
          description?: string | null
          dropoff_location?: string | null
          errand_payment_status?: string | null
          estimated_duration_minutes?: number | null
          id?: string
          merchant_payment_note?: string | null
          notes?: string | null
          payment_method?: string | null
          pickup_location?: string | null
          platform_fee?: number
          preferred_date?: string | null
          preferred_runner_id?: string | null
          recipient_name?: string | null
          recipient_phone?: string | null
          runner_id?: string | null
          runner_payout?: number
          service_category?: string | null
          service_type: string
          status?: Database["public"]["Enums"]["errand_status"]
          title: string
          total_amount?: number
          transaction_fee_amount?: number
          updated_at?: string
        }
        Update: {
          area_type?: string | null
          base_amount?: number
          created_at?: string
          customer_id?: string
          delivery_location?: string | null
          description?: string | null
          dropoff_location?: string | null
          errand_payment_status?: string | null
          estimated_duration_minutes?: number | null
          id?: string
          merchant_payment_note?: string | null
          notes?: string | null
          payment_method?: string | null
          pickup_location?: string | null
          platform_fee?: number
          preferred_date?: string | null
          preferred_runner_id?: string | null
          recipient_name?: string | null
          recipient_phone?: string | null
          runner_id?: string | null
          runner_payout?: number
          service_category?: string | null
          service_type?: string
          status?: Database["public"]["Enums"]["errand_status"]
          title?: string
          total_amount?: number
          transaction_fee_amount?: number
          updated_at?: string
        }
        Relationships: []
      }
      manual_payments: {
        Row: {
          admin_note: string | null
          amount: number
          business_name: string
          created_at: string
          errand_id: string | null
          id: string
          mpesa_code: string
          purpose: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          till_number: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          amount: number
          business_name?: string
          created_at?: string
          errand_id?: string | null
          id?: string
          mpesa_code: string
          purpose?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          till_number?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          amount?: number
          business_name?: string
          created_at?: string
          errand_id?: string | null
          id?: string
          mpesa_code?: string
          purpose?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          till_number?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string | null
          conversation_id: string
          created_at: string
          id: string
          image_url: string | null
          read_at: string | null
          sender_id: string
        }
        Insert: {
          content?: string | null
          conversation_id: string
          created_at?: string
          id?: string
          image_url?: string | null
          read_at?: string | null
          sender_id: string
        }
        Update: {
          content?: string | null
          conversation_id?: string
          created_at?: string
          id?: string
          image_url?: string | null
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      mpesa_payment_attempts: {
        Row: {
          account_reference: string
          amount: number
          callback_payload: Json | null
          checkout_request_id: string | null
          completed_at: string | null
          created_at: string
          errand_id: string | null
          fee_amount: number
          id: string
          merchant_request_id: string | null
          mpesa_receipt_number: string | null
          phone_number: string
          provider: string
          purpose: string
          raw_request_payload: Json | null
          raw_response_payload: Json | null
          result_code: number | null
          result_desc: string | null
          status: string
          total_amount: number
          transaction_desc: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_reference: string
          amount: number
          callback_payload?: Json | null
          checkout_request_id?: string | null
          completed_at?: string | null
          created_at?: string
          errand_id?: string | null
          fee_amount?: number
          id?: string
          merchant_request_id?: string | null
          mpesa_receipt_number?: string | null
          phone_number: string
          provider?: string
          purpose: string
          raw_request_payload?: Json | null
          raw_response_payload?: Json | null
          result_code?: number | null
          result_desc?: string | null
          status?: string
          total_amount: number
          transaction_desc: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_reference?: string
          amount?: number
          callback_payload?: Json | null
          checkout_request_id?: string | null
          completed_at?: string | null
          created_at?: string
          errand_id?: string | null
          fee_amount?: number
          id?: string
          merchant_request_id?: string | null
          mpesa_receipt_number?: string | null
          phone_number?: string
          provider?: string
          purpose?: string
          raw_request_payload?: Json | null
          raw_response_payload?: Json | null
          result_code?: number | null
          result_desc?: string | null
          status?: string
          total_amount?: number
          transaction_desc?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mpesa_payment_attempts_errand_id_fkey"
            columns: ["errand_id"]
            isOneToOne: false
            referencedRelation: "errands"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          errand_id: string | null
          id: string
          mpesa_reference: string | null
          payment_type: string
          phone: string
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          errand_id?: string | null
          id?: string
          mpesa_reference?: string | null
          payment_type?: string
          phone: string
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          errand_id?: string | null
          id?: string
          mpesa_reference?: string | null
          payment_type?: string
          phone?: string
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_errand_id_fkey"
            columns: ["errand_id"]
            isOneToOne: false
            referencedRelation: "errands"
            referencedColumns: ["id"]
          },
        ]
      }
      payout_records: {
        Row: {
          amount: number
          created_at: string
          errand_id: string
          id: string
          runner_id: string
          status: Database["public"]["Enums"]["payout_status"]
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          errand_id: string
          id?: string
          runner_id: string
          status?: Database["public"]["Enums"]["payout_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          errand_id?: string
          id?: string
          runner_id?: string
          status?: Database["public"]["Enums"]["payout_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payout_records_errand_id_fkey"
            columns: ["errand_id"]
            isOneToOne: false
            referencedRelation: "errands"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_earnings: {
        Row: {
          amount: number
          created_at: string
          description: string
          id: string
          source_reference_id: string | null
          source_type: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string
          id?: string
          source_reference_id?: string | null
          source_type: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          id?: string
          source_reference_id?: string | null
          source_type?: string
        }
        Relationships: []
      }
      preferred_runners: {
        Row: {
          client_id: string
          created_at: string
          id: string
          runner_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          runner_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          runner_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          landmark: string | null
          phone: string
          town: string | null
          updated_at: string
          user_id: string
          wallet_balance: number
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          landmark?: string | null
          phone?: string
          town?: string | null
          updated_at?: string
          user_id: string
          wallet_balance?: number
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          landmark?: string | null
          phone?: string
          town?: string | null
          updated_at?: string
          user_id?: string
          wallet_balance?: number
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      runner_ratings: {
        Row: {
          client_id: string
          created_at: string
          errand_id: string
          id: string
          rating: number
          review: string | null
          runner_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          errand_id: string
          id?: string
          rating: number
          review?: string | null
          runner_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          errand_id?: string
          id?: string
          rating?: number
          review?: string | null
          runner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "runner_ratings_errand_id_fkey"
            columns: ["errand_id"]
            isOneToOne: false
            referencedRelation: "errands"
            referencedColumns: ["id"]
          },
        ]
      }
      runner_verifications: {
        Row: {
          availability: string | null
          bio: string | null
          created_at: string
          emergency_contact: string | null
          full_name: string
          id: string
          id_back_url: string | null
          id_document_url: string | null
          intro_video_url: string | null
          national_id: string | null
          phone: string
          profile_photo_url: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          selfie_url: string | null
          status: Database["public"]["Enums"]["verification_status"]
          submitted_at: string | null
          town: string | null
          transport: string | null
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          availability?: string | null
          bio?: string | null
          created_at?: string
          emergency_contact?: string | null
          full_name?: string
          id?: string
          id_back_url?: string | null
          id_document_url?: string | null
          intro_video_url?: string | null
          national_id?: string | null
          phone?: string
          profile_photo_url?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          selfie_url?: string | null
          status?: Database["public"]["Enums"]["verification_status"]
          submitted_at?: string | null
          town?: string | null
          transport?: string | null
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          availability?: string | null
          bio?: string | null
          created_at?: string
          emergency_contact?: string | null
          full_name?: string
          id?: string
          id_back_url?: string | null
          id_document_url?: string | null
          intro_video_url?: string | null
          national_id?: string | null
          phone?: string
          profile_photo_url?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          selfie_url?: string | null
          status?: Database["public"]["Enums"]["verification_status"]
          submitted_at?: string | null
          town?: string | null
          transport?: string | null
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      runner_withdrawals: {
        Row: {
          amount: number
          id: string
          payout_details: Json | null
          payout_method: string
          rejection_reason: string | null
          requested_at: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          amount: number
          id?: string
          payout_details?: Json | null
          payout_method?: string
          rejection_reason?: string | null
          requested_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          id?: string
          payout_details?: Json | null
          payout_method?: string
          rejection_reason?: string | null
          requested_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      saved_addresses: {
        Row: {
          address: string
          created_at: string
          id: string
          label: string
          user_id: string
        }
        Insert: {
          address: string
          created_at?: string
          id?: string
          label: string
          user_id: string
        }
        Update: {
          address?: string
          created_at?: string
          id?: string
          label?: string
          user_id?: string
        }
        Relationships: []
      }
      shop_check_requests: {
        Row: {
          concern: string | null
          created_at: string
          customer_id: string
          errand_id: string | null
          id: string
          item_checked: string | null
          platform: string | null
          result: string | null
          screenshot_url: string | null
          seller_phone: string | null
          shop_link: string | null
          shop_name: string
          status: string
          updated_at: string
        }
        Insert: {
          concern?: string | null
          created_at?: string
          customer_id: string
          errand_id?: string | null
          id?: string
          item_checked?: string | null
          platform?: string | null
          result?: string | null
          screenshot_url?: string | null
          seller_phone?: string | null
          shop_link?: string | null
          shop_name: string
          status?: string
          updated_at?: string
        }
        Update: {
          concern?: string | null
          created_at?: string
          customer_id?: string
          errand_id?: string | null
          id?: string
          item_checked?: string | null
          platform?: string | null
          result?: string | null
          screenshot_url?: string | null
          seller_phone?: string | null
          shop_link?: string | null
          shop_name?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_check_requests_errand_id_fkey"
            columns: ["errand_id"]
            isOneToOne: false
            referencedRelation: "errands"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      user_notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          related_entity_id: string | null
          related_entity_type: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          related_entity_id?: string | null
          related_entity_type?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          related_entity_id?: string | null
          related_entity_type?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wallet_accounts: {
        Row: {
          balance: number
          created_at: string
          id: string
          pending_balance: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          pending_balance?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          pending_balance?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          description: string | null
          direction: string | null
          id: string
          reference: string | null
          reference_id: string | null
          reference_type: string | null
          status: string | null
          transaction_type: string | null
          type: string
          user_id: string
          wallet_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          direction?: string | null
          id?: string
          reference?: string | null
          reference_id?: string | null
          reference_type?: string | null
          status?: string | null
          transaction_type?: string | null
          type: string
          user_id: string
          wallet_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          direction?: string | null
          id?: string
          reference?: string | null
          reference_id?: string | null
          reference_type?: string | null
          status?: string | null
          transaction_type?: string | null
          type?: string
          user_id?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallet_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      withdrawal_requests: {
        Row: {
          admin_note: string | null
          amount: number
          created_at: string
          id: string
          phone: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          amount: number
          created_at?: string
          id?: string
          phone?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          amount?: number
          created_at?: string
          id?: string
          phone?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_errand: {
        Args: { p_errand_id: string; p_runner_id: string }
        Returns: Json
      }
      approve_manual_payment: {
        Args: {
          p_admin_id: string
          p_admin_note?: string
          p_payment_id: string
        }
        Returns: Json
      }
      assign_safe_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: undefined
      }
      complete_errand: {
        Args: { p_errand_id: string; p_user_id: string }
        Returns: Json
      }
      create_admin_notification: {
        Args: {
          p_message: string
          p_priority?: string
          p_related_entity_id?: string
          p_related_entity_type?: string
          p_related_user_id?: string
          p_title: string
          p_type: string
        }
        Returns: string
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_available_errands: {
        Args: never
        Returns: {
          area_type: string
          base_amount: number
          created_at: string
          description: string
          dropoff_location: string
          estimated_duration_minutes: number
          id: string
          pickup_location: string
          platform_fee: number
          preferred_date: string
          runner_payout: number
          service_category: string
          service_type: string
          status: Database["public"]["Enums"]["errand_status"]
          title: string
          total_amount: number
        }[]
      }
      get_or_create_conversation: {
        Args: { p_user_1: string; p_user_2: string }
        Returns: string
      }
      get_runner_profile: { Args: { p_runner_id: string }; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_conversation_participant: {
        Args: { _conversation_id: string; _user_id: string }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      pay_errand_from_wallet: {
        Args: { p_errand_id: string; p_user_id: string }
        Returns: Json
      }
      process_mpesa_callback: {
        Args: {
          p_callback_payload?: Json
          p_checkout_request_id: string
          p_mpesa_receipt?: string
          p_result_code: number
          p_result_desc: string
        }
        Returns: Json
      }
      process_withdrawal_approval: {
        Args: { p_admin_id: string; p_source?: string; p_withdrawal_id: string }
        Returns: Json
      }
      raise_dispute: {
        Args: {
          p_against_user_id: string
          p_dispute_type: string
          p_errand_id: string
          p_reason: string
          p_user_id: string
        }
        Returns: Json
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      record_errand_payment: {
        Args: { p_errand_id: string; p_user_id: string }
        Returns: Json
      }
      reject_manual_payment: {
        Args: {
          p_admin_id: string
          p_admin_note?: string
          p_payment_id: string
        }
        Returns: Json
      }
      resolve_dispute_settlement: {
        Args: {
          p_admin_id: string
          p_dispute_id: string
          p_favor: string
          p_resolution_note?: string
        }
        Returns: Json
      }
      search_runners: {
        Args: { p_query: string }
        Returns: {
          avatar_url: string
          avg_rating: number
          bio: string
          completed_errands: number
          full_name: string
          total_ratings: number
          town: string
          user_id: string
          username: string
        }[]
      }
      update_errand_status: {
        Args: {
          p_errand_id: string
          p_new_status: Database["public"]["Enums"]["errand_status"]
          p_user_id: string
        }
        Returns: Json
      }
    }
    Enums: {
      app_role: "customer" | "runner" | "admin"
      errand_status:
        | "pending_payment"
        | "paid"
        | "open"
        | "assigned"
        | "in_progress"
        | "awaiting_confirmation"
        | "completed"
        | "cancelled"
      payment_status:
        | "pending"
        | "successful"
        | "failed"
        | "cancelled"
        | "refunded"
      payout_status: "pending" | "released" | "failed"
      verification_status:
        | "not_submitted"
        | "under_review"
        | "verified"
        | "rejected"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["customer", "runner", "admin"],
      errand_status: [
        "pending_payment",
        "paid",
        "open",
        "assigned",
        "in_progress",
        "awaiting_confirmation",
        "completed",
        "cancelled",
      ],
      payment_status: [
        "pending",
        "successful",
        "failed",
        "cancelled",
        "refunded",
      ],
      payout_status: ["pending", "released", "failed"],
      verification_status: [
        "not_submitted",
        "under_review",
        "verified",
        "rejected",
      ],
    },
  },
} as const
