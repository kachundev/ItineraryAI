export interface RestaurantOption {
  name: string;
  cuisine: string;
  rating: string;
  description: string;
  priceLevel?: string; // e.g., $$, $$$
}

export interface Activity {
  time: string;
  title: string;
  description: string;
  type: string; // e.g., 'sightseeing', 'breakfast', 'lunch', 'dinner', 'transport'
  cost?: string;
  location?: string;
  duration?: string;
  imageKeyword?: string; // For generating dynamic images
  imageUrl?: string; // Generated URL for the activity image

  // New fields for detailed guide
  tips?: string; // Booking, tickets, best time to visit
  transport?: string; // How to get here or get to next spot

  // Specific for meals
  restaurantOptions?: RestaurantOption[];
}

export interface DayPlan {
  day: number;
  date: string; // YYYY-MM-DD
  title: string;
  activities: Activity[];
}

export interface Itinerary {
  id: string;
  userId?: string;
  title: string;
  location: string;
  startDate: string;
  endDate: string;
  createdAt?: string; // ISO date string from DB created_at
  days: DayPlan[];
  coverImage?: string;
  tags?: string[];
  likes?: number;
  author?: {
    name: string;
    avatar: string;
    role?: string;
  };
  status?: 'published' | 'draft' | 'upcoming';
  budget?: string;
  rating?: number;
  description?: string;
  generated?: boolean;
  isPublic?: boolean;
}

export interface User {
  id: string; // Add ID as it's useful
  name: string;
  email?: string;
  username?: string; // New field
  bio?: string; // New field
  avatar?: string;
  banner?: string; // Banner image URL
  joinedAt?: string; // 加入日期
  stats?: {
    trips: number;
    fans?: number; // Optional as we don't have this yet
    likes: number;
  };
}

export interface Comment {
  id: string;
  userId: string;
  itineraryId: string;
  content: string;
  createdAt: string;
  user?: {
    id: string;
    fullName?: string;
    avatarUrl?: string;
    email?: string;
  };
}