export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      achievement_people: {
        Row: {
          achievement_id: string
          id: string
          person_id: string
        }
        Insert: {
          achievement_id: string
          id?: string
          person_id: string
        }
        Update: {
          achievement_id?: string
          id?: string
          person_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "achievement_people_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "achievement_people_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      achievements: {
        Row: {
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          name: string
          owner_id: string | null
          unlocked: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          owner_id?: string | null
          unlocked: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          owner_id?: string | null
          unlocked?: string
        }
        Relationships: [
          {
            foreignKeyName: "achievements_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      allowed_attributes: {
        Row: {
          display_style: string
          id: string
          name: string
          roll_type: string | null
          short_code: string
          sort_order: number
          tenant: string
        }
        Insert: {
          display_style: string
          id?: string
          name: string
          roll_type?: string | null
          short_code: string
          sort_order: number
          tenant: string
        }
        Update: {
          display_style?: string
          id?: string
          name?: string
          roll_type?: string | null
          short_code?: string
          sort_order?: number
          tenant?: string
        }
        Relationships: []
      }
      campaign: {
        Row: {
          captain: string | null
          created_at: string | null
          crewcount: number | null
          date: string | null
          id: string
          name: string
          ship: string | null
          ship_id: string | null
          stamina_reduction: number | null
          timeline_id: string | null
          xp: number | null
        }
        Insert: {
          captain?: string | null
          created_at?: string | null
          crewcount?: number | null
          date?: string | null
          id?: string
          name: string
          ship?: string | null
          ship_id?: string | null
          stamina_reduction?: number | null
          timeline_id?: string | null
          xp?: number | null
        }
        Update: {
          captain?: string | null
          created_at?: string | null
          crewcount?: number | null
          date?: string | null
          id?: string
          name?: string
          ship?: string | null
          ship_id?: string | null
          stamina_reduction?: number | null
          timeline_id?: string | null
          xp?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_ship_id_fkey"
            columns: ["ship_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_timeline_id_fkey"
            columns: ["timeline_id"]
            isOneToOne: false
            referencedRelation: "timelines"
            referencedColumns: ["id"]
          },
        ]
      }
      combat_sessions: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
        }
        Relationships: []
      }
      combat_states: {
        Row: {
          id: string
          name: string
          tenant: string
        }
        Insert: {
          id?: string
          name: string
          tenant: string
        }
        Update: {
          id?: string
          name?: string
          tenant?: string
        }
        Relationships: []
      }
      combatant_attributes: {
        Row: {
          combatant_id: string
          current: number
          id: string
          max: number
          type: string
        }
        Insert: {
          combatant_id: string
          current: number
          id?: string
          max: number
          type: string
        }
        Update: {
          combatant_id?: string
          current?: number
          id?: string
          max?: number
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "combatant_attributes_combatant_id_fkey"
            columns: ["combatant_id"]
            isOneToOne: false
            referencedRelation: "combatants"
            referencedColumns: ["id"]
          },
        ]
      }
      combatant_states: {
        Row: {
          combatant_id: string
          id: string
          state: string
        }
        Insert: {
          combatant_id: string
          id?: string
          state: string
        }
        Update: {
          combatant_id?: string
          id?: string
          state?: string
        }
        Relationships: [
          {
            foreignKeyName: "combatant_states_combatant_id_fkey"
            columns: ["combatant_id"]
            isOneToOne: false
            referencedRelation: "combatants"
            referencedColumns: ["id"]
          },
        ]
      }
      combatants: {
        Row: {
          active: boolean | null
          combat_session_id: string
          id: string
          initiative: number | null
          name: string | null
          person_id: string | null
        }
        Insert: {
          active?: boolean | null
          combat_session_id: string
          id?: string
          initiative?: number | null
          name?: string | null
          person_id?: string | null
        }
        Update: {
          active?: boolean | null
          combat_session_id?: string
          id?: string
          initiative?: number | null
          name?: string | null
          person_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "combatants_combat_session_id_fkey"
            columns: ["combat_session_id"]
            isOneToOne: false
            referencedRelation: "combat_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "combatants_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      document_access: {
        Row: {
          created_at: string | null
          entity_id: string
          entity_type: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          entity_id: string
          entity_type: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_access_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      flow_items: {
        Row: {
          entity_id: string
          flow_id: string
          id: string
          sort_order: number
          type: Database["public"]["Enums"]["flow_item_type"]
        }
        Insert: {
          entity_id: string
          flow_id: string
          id?: string
          sort_order: number
          type: Database["public"]["Enums"]["flow_item_type"]
        }
        Update: {
          entity_id?: string
          flow_id?: string
          id?: string
          sort_order?: number
          type?: Database["public"]["Enums"]["flow_item_type"]
        }
        Relationships: [
          {
            foreignKeyName: "flow_items_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "flows"
            referencedColumns: ["id"]
          },
        ]
      }
      flows: {
        Row: {
          created_at: string | null
          date: string
          id: string
          owner_id: string | null
          title: string | null
        }
        Insert: {
          created_at?: string | null
          date: string
          id?: string
          owner_id?: string | null
          title?: string | null
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          owner_id?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "flows_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      historic_events: {
        Row: {
          content: string
          created_at: string | null
          date: string | null
          id: string
          modified_at: string | null
          owner_id: string | null
          timeline_id: string
          type: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          date?: string | null
          id?: string
          modified_at?: string | null
          owner_id?: string | null
          timeline_id: string
          type?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          date?: string | null
          id?: string
          modified_at?: string | null
          owner_id?: string | null
          timeline_id?: string
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "historic_events_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historic_events_timeline_id_fkey"
            columns: ["timeline_id"]
            isOneToOne: false
            referencedRelation: "timelines"
            referencedColumns: ["id"]
          },
        ]
      }
      hit_locations: {
        Row: {
          id: string
          location_name: string
          roll_value: number
          tenant: string
        }
        Insert: {
          id?: string
          location_name: string
          roll_value: number
          tenant: string
        }
        Update: {
          id?: string
          location_name?: string
          roll_value?: number
          tenant?: string
        }
        Relationships: []
      }
      info_boxes: {
        Row: {
          content: string
          created_at: string | null
          entity_id: string
          entity_type: string
          id: string
          modified_at: string | null
          owner_id: string | null
          type: Database["public"]["Enums"]["info_type"]
        }
        Insert: {
          content: string
          created_at?: string | null
          entity_id: string
          entity_type: string
          id?: string
          modified_at?: string | null
          owner_id?: string | null
          type: Database["public"]["Enums"]["info_type"]
        }
        Update: {
          content?: string
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          modified_at?: string | null
          owner_id?: string | null
          type?: Database["public"]["Enums"]["info_type"]
        }
        Relationships: [
          {
            foreignKeyName: "info_boxes_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory: {
        Row: {
          amount: number
          character: string | null
          created_at: string | null
          id: string
          name: string
          owner_id: string | null
        }
        Insert: {
          amount: number
          character?: string | null
          created_at?: string | null
          id?: string
          name: string
          owner_id?: string | null
        }
        Update: {
          amount?: number
          character?: string | null
          created_at?: string | null
          id?: string
          name?: string
          owner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          category: string | null
          content: string | null
          created_at: string | null
          id: string
          modified_at: string | null
          owner_id: string | null
          title: string | null
        }
        Insert: {
          category?: string | null
          content?: string | null
          created_at?: string | null
          id?: string
          modified_at?: string | null
          owner_id?: string | null
          title?: string | null
        }
        Update: {
          category?: string | null
          content?: string | null
          created_at?: string | null
          id?: string
          modified_at?: string | null
          owner_id?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notes_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      people: {
        Row: {
          banner: string | null
          birthday: string | null
          birthyear: number | null
          created_at: string | null
          culture: string | null
          deathday: string | null
          height: number | null
          id: string
          image: string | null
          location_id: string | null
          name: string
          owner_id: string | null
          pc: boolean | null
          profession: string | null
          race: string | null
          title: string | null
          xp: number | null
        }
        Insert: {
          banner?: string | null
          birthday?: string | null
          birthyear?: number | null
          created_at?: string | null
          culture?: string | null
          deathday?: string | null
          height?: number | null
          id?: string
          image?: string | null
          location_id?: string | null
          name: string
          owner_id?: string | null
          pc?: boolean | null
          profession?: string | null
          race?: string | null
          title?: string | null
          xp?: number | null
        }
        Update: {
          banner?: string | null
          birthday?: string | null
          birthyear?: number | null
          created_at?: string | null
          culture?: string | null
          deathday?: string | null
          height?: number | null
          id?: string
          image?: string | null
          location_id?: string | null
          name?: string
          owner_id?: string | null
          pc?: boolean | null
          profession?: string | null
          race?: string | null
          title?: string | null
          xp?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "people_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "people_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      person_advantages: {
        Row: {
          details: string | null
          id: string
          level: string | null
          person_id: string
          rule_id: string
        }
        Insert: {
          details?: string | null
          id?: string
          level?: string | null
          person_id: string
          rule_id: string
        }
        Update: {
          details?: string | null
          id?: string
          level?: string | null
          person_id?: string
          rule_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "person_advantages_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_advantages_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "rules"
            referencedColumns: ["id"]
          },
        ]
      }
      person_attributes: {
        Row: {
          current: number
          id: string
          max: number
          person_id: string
          type: string
        }
        Insert: {
          current: number
          id?: string
          max: number
          person_id: string
          type: string
        }
        Update: {
          current?: number
          id?: string
          max?: number
          person_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "person_attributes_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      person_cantrips: {
        Row: {
          id: string
          person_id: string
          rule_id: string
          value: number
        }
        Insert: {
          id?: string
          person_id: string
          rule_id: string
          value: number
        }
        Update: {
          id?: string
          person_id?: string
          rule_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "person_cantrips_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_cantrips_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "rules"
            referencedColumns: ["id"]
          },
        ]
      }
      person_disadvantages: {
        Row: {
          details: string | null
          id: string
          level: string | null
          person_id: string
          rule_id: string
        }
        Insert: {
          details?: string | null
          id?: string
          level?: string | null
          person_id: string
          rule_id: string
        }
        Update: {
          details?: string | null
          id?: string
          level?: string | null
          person_id?: string
          rule_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "person_disadvantages_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_disadvantages_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "rules"
            referencedColumns: ["id"]
          },
        ]
      }
      person_feats: {
        Row: {
          details: string | null
          id: string
          level: string | null
          person_id: string
          rule_id: string
        }
        Insert: {
          details?: string | null
          id?: string
          level?: string | null
          person_id: string
          rule_id: string
        }
        Update: {
          details?: string | null
          id?: string
          level?: string | null
          person_id?: string
          rule_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "person_feats_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_feats_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "rules"
            referencedColumns: ["id"]
          },
        ]
      }
      person_liturgies: {
        Row: {
          id: string
          person_id: string
          rule_id: string
          value: number
        }
        Insert: {
          id?: string
          person_id: string
          rule_id: string
          value: number
        }
        Update: {
          id?: string
          person_id?: string
          rule_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "person_liturgies_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_liturgies_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "rules"
            referencedColumns: ["id"]
          },
        ]
      }
      person_relationships: {
        Row: {
          id: string
          person_id: string
          related_person_id: string
          relationship_type: string
        }
        Insert: {
          id?: string
          person_id: string
          related_person_id: string
          relationship_type: string
        }
        Update: {
          id?: string
          person_id?: string
          related_person_id?: string
          relationship_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "person_relationships_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_relationships_related_person_id_fkey"
            columns: ["related_person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      person_skills: {
        Row: {
          id: string
          person_id: string
          rule_id: string
          value: number
        }
        Insert: {
          id?: string
          person_id: string
          rule_id: string
          value: number
        }
        Update: {
          id?: string
          person_id?: string
          rule_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "person_skills_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_skills_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "rules"
            referencedColumns: ["id"]
          },
        ]
      }
      person_spells: {
        Row: {
          id: string
          person_id: string
          rule_id: string
          value: number
        }
        Insert: {
          id?: string
          person_id: string
          rule_id: string
          value: number
        }
        Update: {
          id?: string
          person_id?: string
          rule_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "person_spells_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_spells_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "rules"
            referencedColumns: ["id"]
          },
        ]
      }
      person_tags: {
        Row: {
          id: string
          person_id: string
          tag: string
        }
        Insert: {
          id?: string
          person_id: string
          tag: string
        }
        Update: {
          id?: string
          person_id?: string
          tag?: string
        }
        Relationships: [
          {
            foreignKeyName: "person_tags_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      places: {
        Row: {
          created_at: string | null
          id: string
          image: string | null
          inhabitants: string | null
          name: string
          owner_id: string | null
          parent_id: string | null
          type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          image?: string | null
          inhabitants?: string | null
          name: string
          owner_id?: string | null
          parent_id?: string | null
          type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          image?: string | null
          inhabitants?: string | null
          name?: string
          owner_id?: string | null
          parent_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "places_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "places_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["id"]
          },
        ]
      }
      project_milestones: {
        Row: {
          description: string | null
          id: string
          project_id: string
          required_points: number
          sort_order: number | null
        }
        Insert: {
          description?: string | null
          id?: string
          project_id: string
          required_points: number
          sort_order?: number | null
        }
        Update: {
          description?: string | null
          id?: string
          project_id?: string
          required_points?: number
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "project_milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_requirements: {
        Row: {
          current_points: number | null
          id: string
          project_id: string
          required_points: number
          skill: string
          sort_order: number | null
          threshold: number
        }
        Insert: {
          current_points?: number | null
          id?: string
          project_id: string
          required_points: number
          skill: string
          sort_order?: number | null
          threshold: number
        }
        Update: {
          current_points?: number | null
          id?: string
          project_id?: string
          required_points?: number
          skill?: string
          sort_order?: number | null
          threshold?: number
        }
        Relationships: [
          {
            foreignKeyName: "project_requirements_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          benefit: string | null
          created_at: string | null
          id: string
          interval: string | null
          name: string
          owner_id: string | null
        }
        Insert: {
          benefit?: string | null
          created_at?: string | null
          id?: string
          interval?: string | null
          name: string
          owner_id?: string | null
        }
        Update: {
          benefit?: string | null
          created_at?: string | null
          id?: string
          interval?: string | null
          name?: string
          owner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      quests: {
        Row: {
          completed: boolean | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          owner_id: string | null
          parent_id: string | null
          type: string
        }
        Insert: {
          completed?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          owner_id?: string | null
          parent_id?: string | null
          type: string
        }
        Update: {
          completed?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          owner_id?: string | null
          parent_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "quests_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quests_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "quests"
            referencedColumns: ["id"]
          },
        ]
      }
      rolls: {
        Row: {
          attribute: number | null
          attributes: number[] | null
          created_at: string | null
          dice_rolls: number[] | null
          dice_type: string | null
          id: string
          modifier: number | null
          name: string | null
          owner_id: string | null
          roll: number | null
          rolls: number[] | null
          skill_points: number | null
          type: Database["public"]["Enums"]["roll_type"]
        }
        Insert: {
          attribute?: number | null
          attributes?: number[] | null
          created_at?: string | null
          dice_rolls?: number[] | null
          dice_type?: string | null
          id?: string
          modifier?: number | null
          name?: string | null
          owner_id?: string | null
          roll?: number | null
          rolls?: number[] | null
          skill_points?: number | null
          type: Database["public"]["Enums"]["roll_type"]
        }
        Update: {
          attribute?: number | null
          attributes?: number[] | null
          created_at?: string | null
          dice_rolls?: number[] | null
          dice_type?: string | null
          id?: string
          modifier?: number | null
          name?: string | null
          owner_id?: string | null
          roll?: number | null
          rolls?: number[] | null
          skill_points?: number | null
          type?: Database["public"]["Enums"]["roll_type"]
        }
        Relationships: [
          {
            foreignKeyName: "rolls_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      rules: {
        Row: {
          category: Database["public"]["Enums"]["rule_category"]
          created_at: string | null
          description: string | null
          id: string
          is_custom: boolean | null
          is_static: boolean | null
          name: string
        }
        Insert: {
          category: Database["public"]["Enums"]["rule_category"]
          created_at?: string | null
          description?: string | null
          id?: string
          is_custom?: boolean | null
          is_static?: boolean | null
          name: string
        }
        Update: {
          category?: Database["public"]["Enums"]["rule_category"]
          created_at?: string | null
          description?: string | null
          id?: string
          is_custom?: boolean | null
          is_static?: boolean | null
          name?: string
        }
        Relationships: []
      }
      rules_config: {
        Row: {
          addable_rule_types: Json
          edition: number
          id: string
          tenant: string
        }
        Insert: {
          addable_rule_types: Json
          edition: number
          id?: string
          tenant: string
        }
        Update: {
          addable_rule_types?: Json
          edition?: number
          id?: string
          tenant?: string
        }
        Relationships: []
      }
      timelines: {
        Row: {
          created_at: string | null
          id: string
          name: string
          owner_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          owner_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          owner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "timelines_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          firebase_uid: string | null
          id: string
          name: string
          view_ancestry: boolean | null
          view_banner: boolean | null
          view_location: boolean | null
          view_name: boolean | null
          view_title: boolean | null
        }
        Insert: {
          created_at?: string | null
          firebase_uid?: string | null
          id: string
          name: string
          view_ancestry?: boolean | null
          view_banner?: boolean | null
          view_location?: boolean | null
          view_name?: boolean | null
          view_title?: boolean | null
        }
        Update: {
          created_at?: string | null
          firebase_uid?: string | null
          id?: string
          name?: string
          view_ancestry?: boolean | null
          view_banner?: boolean | null
          view_location?: boolean | null
          view_name?: boolean | null
          view_title?: boolean | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_user_id: { Args: never; Returns: string }
      is_gm: { Args: never; Returns: boolean }
    }
    Enums: {
      flow_item_type: "person" | "place" | "quest" | "note"
      info_type:
        | "appearance"
        | "background"
        | "note"
        | "character"
        | "goals"
        | "reward"
      roll_type: "attribute" | "skill" | "skill5" | "damage" | "dice"
      rule_category:
        | "advantage"
        | "disadvantage"
        | "feat"
        | "skill"
        | "spell"
        | "cantrip"
        | "liturgy"
      user_role: "observer" | "player" | "co_gm" | "gm"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      flow_item_type: ["person", "place", "quest", "note"],
      info_type: [
        "appearance",
        "background",
        "note",
        "character",
        "goals",
        "reward",
      ],
      roll_type: ["attribute", "skill", "skill5", "damage", "dice"],
      rule_category: [
        "advantage",
        "disadvantage",
        "feat",
        "skill",
        "spell",
        "cantrip",
        "liturgy",
      ],
      user_role: ["observer", "player", "co_gm", "gm"],
    },
  },
} as const

