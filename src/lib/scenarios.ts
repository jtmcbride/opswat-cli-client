export interface Scenario {
  id: string;
  title: string;
  icon: 'cafe-outline' | 'map-outline' | 'bag-handle-outline' | 'bed-outline' | 'medkit-outline' | 'people-outline' | 'train-outline';
  /** Instructions for the tutor (in English; the tutor replies in the target language). */
  prompt: string;
}

export const SCENARIOS: Scenario[] = [
  {
    id: 'cafe',
    title: 'Ordering at a café',
    icon: 'cafe-outline',
    prompt: 'You are a waiter at a busy café. Greet the customer, take their order, suggest something, and handle the bill.',
  },
  {
    id: 'directions',
    title: 'Asking for directions',
    icon: 'map-outline',
    prompt: 'You are a local on the street. The learner is a tourist who is a bit lost. Help them find their way to a landmark.',
  },
  {
    id: 'shopping',
    title: 'Shopping for clothes',
    icon: 'bag-handle-outline',
    prompt: 'You are a shop assistant in a clothing store. Help the customer find something, discuss sizes, colours and prices.',
  },
  {
    id: 'hotel',
    title: 'Checking into a hotel',
    icon: 'bed-outline',
    prompt: 'You are a hotel receptionist. Check the guest in: reservation, name, nights, breakfast, and room questions.',
  },
  {
    id: 'doctor',
    title: 'At the doctor',
    icon: 'medkit-outline',
    prompt: 'You are a friendly doctor. Ask the patient what is wrong, ask simple follow-up questions, and give advice.',
  },
  {
    id: 'meeting',
    title: 'Meeting someone new',
    icon: 'people-outline',
    prompt: 'You just met the learner at a party. Make small talk: names, where you are from, work, hobbies.',
  },
  {
    id: 'tickets',
    title: 'Buying train tickets',
    icon: 'train-outline',
    prompt: 'You work at a train station ticket office. Help the traveller buy a ticket: destination, times, one-way or return, price.',
  },
];
