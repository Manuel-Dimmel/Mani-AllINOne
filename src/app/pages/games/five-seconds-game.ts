import { Component, HostListener, OnDestroy, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { loadSavedPlayerNames, savePlayerNames } from '../../services/player-storage';

export type FiveSecLang = 'de' | 'en';

export interface FiveSecPlayer {
  id: number;
  name: string;
  color: string;
  score: number; // Position on the board track (0 to targetScore)
  passCardsLeft: number; // "Weitergeben" cards (starts with 2)
  switchCardsLeft: number; // "Wechseln" cards (starts with 2)
}

export interface FiveSecQuestionCard {
  id: number;
  de: string; // e.g. "Nenne 3 Dinge, die man auf eine einsame Insel mitnimmt"
  en: string; // e.g. "Name 3 things you would take to a deserted island"
  categoryDe: string;
  categoryEn: string;
}

export interface ForbiddenWordEntry {
  player: string;
  playerColor: string;
  word: string;
}

const PLAYER_COLORS = [
  '#f59e0b',
  '#06b6d4',
  '#f43f5e',
  '#10b981',
  '#8b5cf6',
  '#ec4899',
  '#3b82f6',
  '#84cc16',
];

export const FIVE_SEC_DECK: FiveSecQuestionCard[] = [
  {
    id: 1,
    de: 'Nenne 3 Dinge, die man auf eine einsame Insel mitnimmt',
    en: 'Name 3 things you would take to a deserted island',
    categoryDe: 'Abenteuer',
    categoryEn: 'Adventure',
  },
  {
    id: 2,
    de: 'Nenne 3 Ausreden, warum man zu spät zur Arbeit kommt',
    en: 'Name 3 excuses for being late to work',
    categoryDe: 'Alltag',
    categoryEn: 'Everyday Life',
  },
  {
    id: 3,
    de: 'Nenne 3 Dinge, die im Kühlschrank stehen',
    en: 'Name 3 things found inside a refrigerator',
    categoryDe: 'Küche',
    categoryEn: 'Kitchen',
  },
  {
    id: 4,
    de: 'Nenne 3 berühmte Bösewichte aus Filmen',
    en: 'Name 3 famous movie villains',
    categoryDe: 'Kino & TV',
    categoryEn: 'Movies & TV',
  },
  {
    id: 5,
    de: 'Nenne 3 Dinge, die klebrig sind',
    en: 'Name 3 things that are sticky',
    categoryDe: 'Eigenschaften',
    categoryEn: 'Properties',
  },
  {
    id: 6,
    de: 'Nenne 3 Pizzabeläge außer Käse und Tomatensoße',
    en: 'Name 3 pizza toppings besides cheese and tomato sauce',
    categoryDe: 'Essen',
    categoryEn: 'Food',
  },
  {
    id: 7,
    de: 'Nenne 3 Dinge, die man nicht im Flugzeug rufen sollte',
    en: 'Name 3 things you should never shout on an airplane',
    categoryDe: 'Humor',
    categoryEn: 'Humor',
  },
  {
    id: 8,
    de: 'Nenne 3 Tiere, die Eier legen (keine Vögel!)',
    en: 'Name 3 animals that lay eggs (no birds!)',
    categoryDe: 'Natur',
    categoryEn: 'Nature',
  },
  {
    id: 9,
    de: 'Nenne 3 Dinge, die man im Badezimmer findet',
    en: 'Name 3 things you find in a bathroom',
    categoryDe: 'Haushalt',
    categoryEn: 'Household',
  },
  {
    id: 10,
    de: 'Nenne 3 europäische Hauptstädte',
    en: 'Name 3 European capital cities',
    categoryDe: 'Geografie',
    categoryEn: 'Geography',
  },
  {
    id: 11,
    de: 'Nenne 3 Dinge, die man vor dem Schlafengehen macht',
    en: 'Name 3 things you do right before going to sleep',
    categoryDe: 'Routine',
    categoryEn: 'Routine',
  },
  {
    id: 12,
    de: 'Nenne 3 Superkräfte, die man gerne hätte',
    en: 'Name 3 superpowers you wish you had',
    categoryDe: 'Fantasie',
    categoryEn: 'Fantasy',
  },
  {
    id: 13,
    de: 'Nenne 3 Dinge, die Räder haben, aber kein Auto sind',
    en: 'Name 3 things with wheels that are not cars',
    categoryDe: 'Technik',
    categoryEn: 'Vehicles',
  },
  {
    id: 14,
    de: 'Nenne 3 Gründe, warum jemand plötzlich schreit',
    en: 'Name 3 reasons why someone suddenly screams',
    categoryDe: 'Reaktion',
    categoryEn: 'Reaction',
  },
  {
    id: 15,
    de: 'Nenne 3 Dinge, die man am Strand braucht',
    en: 'Name 3 things you need at the beach',
    categoryDe: 'Urlaub',
    categoryEn: 'Vacation',
  },
  {
    id: 16,
    de: 'Nenne 3 Berufe, bei denen man eine Uniform trägt',
    en: 'Name 3 jobs where you wear a uniform',
    categoryDe: 'Berufe',
    categoryEn: 'Professions',
  },
  {
    id: 17,
    de: 'Nenne 3 Dinge, die im Dunkeln leuchten',
    en: 'Name 3 things that glow in the dark',
    categoryDe: 'Licht',
    categoryEn: 'Light',
  },
  {
    id: 18,
    de: 'Nenne 3 Eissorten, die kein Obst sind',
    en: 'Name 3 ice cream flavors that are not fruit',
    categoryDe: 'Süßes',
    categoryEn: 'Sweets',
  },
  {
    id: 19,
    de: 'Nenne 3 Dinge, die man auf einer Hochzeit sieht',
    en: 'Name 3 things you see at a wedding',
    categoryDe: 'Feier',
    categoryEn: 'Celebration',
  },
  {
    id: 20,
    de: 'Nenne 3 Videospiel-Helden oder -Charaktere',
    en: 'Name 3 video game heroes or characters',
    categoryDe: 'Gaming',
    categoryEn: 'Gaming',
  },
  {
    id: 21,
    de: 'Nenne 3 Dinge, die man nur im Winter benutzt',
    en: 'Name 3 things you only use in winter',
    categoryDe: 'Jahreszeiten',
    categoryEn: 'Seasons',
  },
  {
    id: 22,
    de: 'Nenne 3 Dinge, die schlecht riechen',
    en: 'Name 3 things that smell terrible',
    categoryDe: 'Alltag',
    categoryEn: 'Everyday Life',
  },
  {
    id: 23,
    de: 'Nenne 3 Musikinstrumente mit Saiten',
    en: 'Name 3 musical instruments with strings',
    categoryDe: 'Musik',
    categoryEn: 'Music',
  },
  {
    id: 24,
    de: 'Nenne 3 Dinge, die teurer als 10.000 Euro sind',
    en: 'Name 3 things that cost more than $10,000',
    categoryDe: 'Luxus',
    categoryEn: 'Luxury',
  },
  {
    id: 25,
    de: 'Nenne 3 Dinge, die man beim ersten Date vermeiden sollte',
    en: 'Name 3 things to avoid on a first date',
    categoryDe: 'Dating',
    categoryEn: 'Dating',
  },
  {
    id: 26,
    de: 'Nenne 3 rote Früchte oder Gemüsesorten',
    en: 'Name 3 red fruits or vegetables',
    categoryDe: 'Natur',
    categoryEn: 'Nature',
  },
  {
    id: 27,
    de: 'Nenne 3 Dinge, die man unter dem Sofa findet',
    en: 'Name 3 things you find under the couch',
    categoryDe: 'Haushalt',
    categoryEn: 'Household',
  },
  {
    id: 28,
    de: 'Nenne 3 Sportarten ohne Ball',
    en: 'Name 3 sports played without a ball',
    categoryDe: 'Sport',
    categoryEn: 'Sports',
  },
  {
    id: 29,
    de: 'Nenne 3 Dinge, die man auf einer Hausparty findet',
    en: 'Name 3 things you find at a house party',
    categoryDe: 'Party',
    categoryEn: 'Party',
  },
  {
    id: 30,
    de: 'Nenne 3 Automarken aus Deutschland',
    en: 'Name 3 German car brands',
    categoryDe: 'Marken',
    categoryEn: 'Brands',
  },
  {
    id: 31,
    de: 'Nenne 3 Schulfächer, die fast jeder gehasst hat',
    en: 'Name 3 school subjects almost everyone hated',
    categoryDe: 'Schule',
    categoryEn: 'School',
  },
  {
    id: 32,
    de: 'Nenne 3 Dinge, die man im Kino isst oder trinkt',
    en: 'Name 3 things you eat or drink at the movie theater',
    categoryDe: 'Kino & TV',
    categoryEn: 'Movies & TV',
  },
  {
    id: 33,
    de: 'Nenne 3 peinliche Dinge, die einem in der Öffentlichkeit passieren können',
    en: 'Name 3 embarrassing things that can happen in public',
    categoryDe: 'Peinlich',
    categoryEn: 'Awkward',
  },
  {
    id: 34,
    de: 'Nenne 3 Hunde-Rassen',
    en: 'Name 3 dog breeds',
    categoryDe: 'Tiere',
    categoryEn: 'Animals',
  },
  {
    id: 35,
    de: 'Nenne 3 Dinge, die man beim Camping vergisst',
    en: 'Name 3 things people always forget when camping',
    categoryDe: 'Outdoor',
    categoryEn: 'Outdoor',
  },
  {
    id: 36,
    de: 'Nenne 3 Disney-Filme',
    en: 'Name 3 Disney movies',
    categoryDe: 'Kino & TV',
    categoryEn: 'Movies & TV',
  },
  {
    id: 37,
    de: 'Nenne 3 Dinge, die man mit einer Fernbedienung steuert',
    en: 'Name 3 things controlled with a remote',
    categoryDe: 'Technik',
    categoryEn: 'Tech',
  },
  {
    id: 38,
    de: 'Nenne 3 Fast-Food-Ketten',
    en: 'Name 3 fast food chains',
    categoryDe: 'Essen',
    categoryEn: 'Food',
  },
  {
    id: 39,
    de: 'Nenne 3 Dinge, die man an einem Regentag drinnen macht',
    en: 'Name 3 things to do indoors on a rainy day',
    categoryDe: 'Freizeit',
    categoryEn: 'Leisure',
  },
  {
    id: 40,
    de: 'Nenne 3 Tiere, die gefährlich für Menschen sind',
    en: 'Name 3 animals that are dangerous to humans',
    categoryDe: 'Tiere',
    categoryEn: 'Animals',
  },
  {
    id: 41,
    de: 'Nenne 3 Dinge, die man in einer Handtasche oder einem Rucksack findet',
    en: 'Name 3 things found in a handbag or backpack',
    categoryDe: 'Alltag',
    categoryEn: 'Everyday Life',
  },
  {
    id: 42,
    de: 'Nenne 3 berühmte Sehenswürdigkeiten weltweit',
    en: 'Name 3 famous landmarks around the world',
    categoryDe: 'Reisen',
    categoryEn: 'Travel',
  },
  {
    id: 43,
    de: 'Nenne 3 Dinge, die man zum Frühstück isst',
    en: 'Name 3 things people eat for breakfast',
    categoryDe: 'Essen',
    categoryEn: 'Food',
  },
  {
    id: 44,
    de: 'Nenne 3 Gründe, warum man sein Handy anstarrt',
    en: 'Name 3 reasons why people stare at their phone',
    categoryDe: 'Popkultur',
    categoryEn: 'Pop Culture',
  },
  {
    id: 45,
    de: 'Nenne 3 Dinge, die scharf sind (Geschmack oder Kante)',
    en: 'Name 3 things that are sharp or spicy',
    categoryDe: 'Eigenschaften',
    categoryEn: 'Properties',
  },
  {
    id: 46,
    de: 'Nenne 3 berühmte Rock- oder Pop-Bands',
    en: 'Name 3 famous rock or pop bands',
    categoryDe: 'Musik',
    categoryEn: 'Music',
  },
  {
    id: 47,
    de: 'Nenne 3 Dinge, die man im Supermarkt an der Kasse sieht',
    en: 'Name 3 things you see at the supermarket checkout',
    categoryDe: 'Alltag',
    categoryEn: 'Everyday Life',
  },
  {
    id: 48,
    de: 'Nenne 3 Kleidungsstücke, die man nur am Oberkörper trägt',
    en: 'Name 3 clothing items worn only on the upper body',
    categoryDe: 'Mode',
    categoryEn: 'Fashion',
  },
  {
    id: 49,
    de: 'Nenne 3 Dinge, die man nicht in die Mikrowelle stecken darf',
    en: 'Name 3 things you should never put in a microwave',
    categoryDe: 'Küche',
    categoryEn: 'Kitchen',
  },
  {
    id: 50,
    de: 'Nenne 3 Brettspiele oder Kartenspiele',
    en: 'Name 3 board games or card games',
    categoryDe: 'Spiele',
    categoryEn: 'Games',
  },
  {
    id: 51,
    de: 'Nenne 3 Dinge, die man beim Zahnarzt sieht oder hört',
    en: 'Name 3 things you see or hear at the dentist',
    categoryDe: 'Alltag',
    categoryEn: 'Everyday Life',
  },
  {
    id: 52,
    de: 'Nenne 3 Länder in Asien',
    en: 'Name 3 countries in Asia',
    categoryDe: 'Geografie',
    categoryEn: 'Geography',
  },
  {
    id: 53,
    de: 'Nenne 3 Dinge, die man für einen perfekten Filmabend braucht',
    en: 'Name 3 things you need for a perfect movie night',
    categoryDe: 'Freizeit',
    categoryEn: 'Leisure',
  },
  {
    id: 54,
    de: 'Nenne 3 Insekten oder Krabbeltiere',
    en: 'Name 3 insects or creepy-crawlies',
    categoryDe: 'Natur',
    categoryEn: 'Nature',
  },
  {
    id: 55,
    de: 'Nenne 3 Dinge, die man auf einem Jahrmarkt oder Volksfest findet',
    en: 'Name 3 things you find at a carnival or fairground',
    categoryDe: 'Feier',
    categoryEn: 'Celebration',
  },
  {
    id: 56,
    de: 'Nenne 3 berühmte Superhelden von Marvel oder DC',
    en: 'Name 3 famous Marvel or DC superheroes',
    categoryDe: 'Popkultur',
    categoryEn: 'Pop Culture',
  },
  {
    id: 57,
    de: 'Nenne 3 Dinge, die man im Fitnessstudio benutzt',
    en: 'Name 3 pieces of equipment used at the gym',
    categoryDe: 'Sport',
    categoryEn: 'Sports',
  },
  {
    id: 58,
    de: 'Nenne 3 Käsesorten',
    en: 'Name 3 types of cheese',
    categoryDe: 'Essen',
    categoryEn: 'Food',
  },
  {
    id: 59,
    de: 'Nenne 3 Dinge, die man tut, wenn niemand zuschaut',
    en: 'Name 3 things people do when nobody is watching',
    categoryDe: 'Humor',
    categoryEn: 'Humor',
  },
  {
    id: 60,
    de: 'Nenne 3 Werkzeuge aus dem Werkzeugkasten',
    en: 'Name 3 tools found in a toolbox',
    categoryDe: 'Haushalt',
    categoryEn: 'Household',
  },
  {
    id: 61,
    de: 'Nenne 3 Dinge, die im Weltraum schweben',
    en: 'Name 3 things floating in outer space',
    categoryDe: 'Wissenschaft',
    categoryEn: 'Science',
  },
  {
    id: 62,
    de: 'Nenne 3 Getränke mit Koffein',
    en: 'Name 3 beverages that contain caffeine',
    categoryDe: 'Getränke',
    categoryEn: 'Drinks',
  },
  {
    id: 63,
    de: 'Nenne 3 Dinge, die man im Hotelzimmer sofort prüft',
    en: 'Name 3 things you immediately check in a hotel room',
    categoryDe: 'Reisen',
    categoryEn: 'Travel',
  },
  {
    id: 64,
    de: 'Nenne 3 Märchenfiguren',
    en: 'Name 3 fairy tale characters',
    categoryDe: 'Fantasie',
    categoryEn: 'Fantasy',
  },
  {
    id: 65,
    de: 'Nenne 3 Dinge, die man an Silvester macht',
    en: "Name 3 things people do on New Year's Eve",
    categoryDe: 'Party',
    categoryEn: 'Party',
  },
  {
    id: 66,
    de: 'Nenne 3 Dinge, die aus Holz bestehen',
    en: 'Name 3 everyday objects made of wood',
    categoryDe: 'Material',
    categoryEn: 'Material',
  },
  {
    id: 67,
    de: 'Nenne 3 Apps, die fast jeder auf dem Smartphone hat',
    en: 'Name 3 apps almost everyone has on their smartphone',
    categoryDe: 'Technik',
    categoryEn: 'Tech',
  },
  {
    id: 68,
    de: 'Nenne 3 Dinge, die man beim Grillen auf den Rost legt',
    en: 'Name 3 things you put on the barbecue grill',
    categoryDe: 'Essen',
    categoryEn: 'Food',
  },
  {
    id: 69,
    de: 'Nenne 3 Gründe, warum ein Wecker morgens ignoriert wird',
    en: 'Name 3 reasons why someone hits snooze in the morning',
    categoryDe: 'Alltag',
    categoryEn: 'Everyday Life',
  },
  {
    id: 70,
    de: 'Nenne 3 Meerestiere, die keine Fische sind',
    en: 'Name 3 sea creatures that are not fish',
    categoryDe: 'Tiere',
    categoryEn: 'Animals',
  },
  {
    id: 71,
    de: 'Nenne 3 Dinge, die man in der Schule heimlich unterm Tisch gemacht hat',
    en: 'Name 3 things students secretly do under the desk in school',
    categoryDe: 'Schule',
    categoryEn: 'School',
  },
  {
    id: 72,
    de: 'Nenne 3 Sportmarken oder Sneaker-Hersteller',
    en: 'Name 3 sportswear or sneaker brands',
    categoryDe: 'Marken',
    categoryEn: 'Brands',
  },
  {
    id: 73,
    de: 'Nenne 3 Dinge, die man für den Hausputz braucht',
    en: 'Name 3 supplies needed for cleaning the house',
    categoryDe: 'Haushalt',
    categoryEn: 'Household',
  },
  {
    id: 74,
    de: 'Nenne 3 Serien, die man an einem Wochenende durchsuchten kann',
    en: 'Name 3 TV series you can binge-watch in a weekend',
    categoryDe: 'Kino & TV',
    categoryEn: 'Movies & TV',
  },
  {
    id: 75,
    de: 'Nenne 3 Dinge, die man auf einem Kindergeburtstag sieht',
    en: "Name 3 things you see at a kids' birthday party",
    categoryDe: 'Feier',
    categoryEn: 'Celebration',
  },
  {
    id: 76,
    de: 'Nenne 3 Dinge, die rund und essbar sind',
    en: 'Name 3 things that are round and edible',
    categoryDe: 'Essen',
    categoryEn: 'Food',
  },
  {
    id: 77,
    de: 'Nenne 3 Dinge, über die sich Nachbarn beschweren',
    en: 'Name 3 things neighbors complain about',
    categoryDe: 'Humor',
    categoryEn: 'Humor',
  },
  {
    id: 78,
    de: 'Nenne 3 Bäume oder Blumenarten',
    en: 'Name 3 types of trees or flowers',
    categoryDe: 'Natur',
    categoryEn: 'Nature',
  },
  {
    id: 79,
    de: 'Nenne 3 Dinge, die einen Knopf oder Schalter haben',
    en: 'Name 3 things that have a button or switch',
    categoryDe: 'Technik',
    categoryEn: 'Tech',
  },
  {
    id: 80,
    de: 'Nenne 3 Dinge, die man im Handschuhfach eines Autos findet',
    en: "Name 3 things found in a car's glove compartment",
    categoryDe: 'Alltag',
    categoryEn: 'Everyday Life',
  },
  {
    id: 81,
    de: 'Nenne 3 berühmte Sportlerinnen oder Sportler',
    en: 'Name 3 world-famous athletes',
    categoryDe: 'Sport',
    categoryEn: 'Sports',
  },
  {
    id: 82,
    de: 'Nenne 3 Süßigkeiten oder Schokoriegel',
    en: 'Name 3 candies or chocolate bars',
    categoryDe: 'Süßes',
    categoryEn: 'Sweets',
  },
  {
    id: 83,
    de: 'Nenne 3 Dinge, die man beim Umzug in Kartons packt',
    en: 'Name 3 things you pack into boxes when moving house',
    categoryDe: 'Haushalt',
    categoryEn: 'Household',
  },
  {
    id: 84,
    de: 'Nenne 3 Dinge, die man in einer Bäckerei kauft',
    en: 'Name 3 things you buy at a bakery',
    categoryDe: 'Essen',
    categoryEn: 'Food',
  },
  {
    id: 85,
    de: 'Nenne 3 Tiere mit Streifen oder Punkten',
    en: 'Name 3 animals with stripes or spots',
    categoryDe: 'Tiere',
    categoryEn: 'Animals',
  },
  {
    id: 86,
    de: 'Nenne 3 Dinge, die man im Freizeitpark fährt',
    en: 'Name 3 rides at an amusement park',
    categoryDe: 'Freizeit',
    categoryEn: 'Leisure',
  },
  {
    id: 87,
    de: 'Nenne 3 Ausreden, warum man die Hausaufgaben nicht hat',
    en: 'Name 3 excuses for not having your homework',
    categoryDe: 'Schule',
    categoryEn: 'School',
  },
  {
    id: 88,
    de: 'Nenne 3 Dinge, die man im Geldbeutel hat (außer Bargeld)',
    en: 'Name 3 things in your wallet besides cash',
    categoryDe: 'Alltag',
    categoryEn: 'Everyday Life',
  },
  {
    id: 89,
    de: 'Nenne 3 Cocktails oder Longdrinks',
    en: 'Name 3 cocktails or mixed drinks',
    categoryDe: 'Party',
    categoryEn: 'Party',
  },
  {
    id: 90,
    de: 'Nenne 3 Dinge, die man macht, wenn das WLAN ausfällt',
    en: 'Name 3 things people do when the Wi-Fi goes down',
    categoryDe: 'Humor',
    categoryEn: 'Humor',
  },
  {
    id: 91,
    de: 'Nenne 3 Bundesländer in Deutschland oder US-Bundesstaaten',
    en: 'Name 3 US states or German states',
    categoryDe: 'Geografie',
    categoryEn: 'Geography',
  },
  {
    id: 92,
    de: 'Nenne 3 Dinge, die man auf dem Schreibtisch findet',
    en: 'Name 3 items found on an office desk',
    categoryDe: 'Berufe',
    categoryEn: 'Professions',
  },
  {
    id: 93,
    de: 'Nenne 3 Dinge, die extrem laut sind',
    en: 'Name 3 things that are extremely loud',
    categoryDe: 'Eigenschaften',
    categoryEn: 'Properties',
  },
  {
    id: 94,
    de: 'Nenne 3 berühmte Sängerinnen oder Sänger',
    en: 'Name 3 famous solo singers',
    categoryDe: 'Musik',
    categoryEn: 'Music',
  },
  {
    id: 95,
    de: 'Nenne 3 Dinge, die man für ein Picknick im Park mitnimmt',
    en: 'Name 3 things you bring to a picnic in the park',
    categoryDe: 'Outdoor',
    categoryEn: 'Outdoor',
  },
  {
    id: 96,
    de: 'Nenne 3 Dinge, die man vor einer Reise in den Koffer packt',
    en: 'Name 3 things you pack in a suitcase before a trip',
    categoryDe: 'Reisen',
    categoryEn: 'Travel',
  },
  {
    id: 97,
    de: 'Nenne 3 Gerichte mit Nudeln oder Pasta',
    en: 'Name 3 pasta or noodle dishes',
    categoryDe: 'Essen',
    categoryEn: 'Food',
  },
  {
    id: 98,
    de: 'Nenne 3 Dinge, die man verliert, genau wenn man es eilig hat',
    en: 'Name 3 things you always lose when you are in a hurry',
    categoryDe: 'Peinlich',
    categoryEn: 'Awkward',
  },
  {
    id: 99,
    de: 'Nenne 3 Vögel, die jeder kennt',
    en: 'Name 3 birds that everyone knows',
    categoryDe: 'Tiere',
    categoryEn: 'Animals',
  },
  {
    id: 100,
    de: 'Nenne 3 Dinge, die man im Schwimmbad sieht',
    en: 'Name 3 things you see at a swimming pool',
    categoryDe: 'Freizeit',
    categoryEn: 'Leisure',
  },
  {
    id: 101,
    de: 'Nenne 3 schlechte Angewohnheiten',
    en: 'Name 3 bad habits people have',
    categoryDe: 'Alltag',
    categoryEn: 'Everyday Life',
  },
  {
    id: 102,
    de: 'Nenne 3 Dinge, die gefroren im Tiefkühlfach liegen',
    en: 'Name 3 things kept frozen in the freezer',
    categoryDe: 'Küche',
    categoryEn: 'Kitchen',
  },
  {
    id: 103,
    de: 'Nenne 3 berühmte Filmreihen oder Trilogien',
    en: 'Name 3 famous movie franchises or trilogies',
    categoryDe: 'Kino & TV',
    categoryEn: 'Movies & TV',
  },
  {
    id: 104,
    de: 'Nenne 3 Dinge, die man zum Geburtstag geschenkt bekommt',
    en: 'Name 3 typical birthday gifts',
    categoryDe: 'Feier',
    categoryEn: 'Celebration',
  },
  {
    id: 105,
    de: 'Nenne 3 Dinge, die man in unter 5 Sekunden erledigen kann',
    en: 'Name 3 things you can do in under 5 seconds',
    categoryDe: 'Party',
    categoryEn: 'Party',
  },
];

@Component({
  selector: 'app-five-seconds-game',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="fivesec-page">
      <!-- TOPBAR -->
      <div class="topbar">
        <a routerLink="/" class="back-btn">
          ← {{ isEn() ? 'Back to Hub' : 'Zurück zur Übersicht' }}
        </a>

        <div class="top-controls">
          <!-- LANGUAGE SWITCHER -->
          <div class="lang-switch-group" title="Sprache / Language">
            <button
              type="button"
              class="lang-btn"
              [class.active]="lang() === 'de'"
              (click)="setLanguage('de')"
            >
              🇩🇪 DE
            </button>
            <button
              type="button"
              class="lang-btn"
              [class.active]="lang() === 'en'"
              (click)="setLanguage('en')"
            >
              🇬🇧 EN
            </button>
          </div>

          <!-- AUDIO SWITCH -->
          <button
            type="button"
            class="switch-pill"
            [class.on]="audioOn()"
            (click)="toggleAudio()"
            title="Spiral-Timer Sound ON/OFF"
          >
            <span class="led"></span>
            <span>
              {{
                audioOn()
                  ? isEn()
                    ? 'AUDIO: ON (Spiral & Buzzer)'
                    : 'AUDIO: ON (Kugel-Rutsche)'
                  : isEn()
                    ? 'AUDIO: OFF (Mute)'
                    : 'AUDIO: OFF (Stumm)'
              }}
            </span>
          </button>

          <button
            type="button"
            class="btn-secondary sm"
            (click)="showRulesModal.set(!showRulesModal())"
          >
            📖
            {{
              isEn()
                ? showRulesModal()
                  ? 'Hide Rules'
                  : 'Game Rules'
                : showRulesModal()
                  ? 'Regeln ausblenden'
                  : 'Spielregeln'
            }}
          </button>

          <button
            type="button"
            class="btn-secondary sm"
            (click)="showSetupModal.set(!showSetupModal())"
          >
            ⚙️ {{ isEn() ? 'Settings & Players' : 'Einstellungen & Spieler' }} ({{
              players().length
            }})
          </button>
        </div>
      </div>

      <!-- COLLAPSIBLE RULES MODAL -->
      @if (showRulesModal()) {
        <section class="rules-panel glass-panel">
          <div class="rules-head">
            <div>
              <h3>
                📖
                {{
                  isEn()
                    ? 'Official 5 Second Rule — Complete Instructions'
                    : 'Offizielle „5 Sekunden Regel“ — Komplette Spielanleitung'
                }}
              </h3>
              <p>
                {{
                  isEn()
                    ? 'How hard can it be to name 3 things in 5 seconds? Under pressure, your brain freezes!'
                    : 'Eigentlich ganz leicht, 3 Dinge zu nennen – aber wenn die Kugeln in 5 Sekunden herunterrasseln, setzt der Kopf aus!'
                }}
              </p>
            </div>
            <button type="button" class="btn-secondary sm" (click)="showRulesModal.set(false)">
              ✕ {{ isEn() ? 'Close' : 'Schließen' }}
            </button>
          </div>

          <div class="rules-grid">
            <div class="rule-card">
              <h4>1️⃣ {{ isEn() ? 'Setup & Special Cards' : 'Vorbereitung & Sonderkarten' }}</h4>
              <p>
                @if (isEn()) {
                  Each player starts on field <strong>0</strong> and receives
                  <strong>2× "Pass" (Weitergeben)</strong> cards and
                  <strong>2× "Switch" (Wechseln)</strong> cards for the entire game. The player to
                  the right acts as the <strong>Question Reader</strong>.
                } @else {
                  Jeder Spieler startet auf Feld <strong>0</strong> und erhält für das gesamte Spiel
                  <strong>2× „Weitergeben“-Karten</strong> sowie
                  <strong>2× „Wechseln“-Karten</strong>. Der rechte Sitznachbar liest die Frage laut
                  vor.
                }
              </p>
            </div>

            <div class="rule-card">
              <h4>2️⃣ {{ isEn() ? '5 Seconds & Spiral Timer' : '5 Sekunden & Kugel-Rutsche' }}</h4>
              <p>
                @if (isEn()) {
                  As soon as the question is read, flip the <strong>5-Second Spiral Timer</strong>!
                  The active player must shout <strong>3 valid answers</strong> before the metallic
                  balls reach the bottom. If successful, they advance <strong>+1 field</strong>!
                } @else {
                  Sobald die Frage vorgelesen wurde, wird der
                  <strong>5-Sekunden-Spiral-Timer</strong> umgedreht! Der aktive Spieler muss
                  <strong>3 passende Begriffe</strong> nennen, bevor die Kugeln unten ankommen.
                  Schafft er es, rückt er <strong>1 Feld vor</strong>!
                }
              </p>
            </div>

            <div class="rule-card">
              <h4>
                3️⃣
                {{
                  isEn()
                    ? 'Failure & Passing Around the Circle'
                    : 'Scheitern & Weiterwandern im Kreis'
                }}
              </h4>
              <p>
                @if (isEn()) {
                  If time runs out, the <strong>exact same question</strong> passes clockwise to the
                  next player! <strong>Important:</strong> Answers already named by previous players
                  are strictly forbidden! If <strong>nobody in the entire circle</strong> manages to
                  name 3 items, the <strong>original starting player gets the point</strong>!
                } @else {
                  Läuft die Zeit ab, wandert <strong>exakt dieselbe Frage</strong> sofort im
                  Uhrzeigersinn an den nächsten Spieler weiter!
                  <strong>Wichtig:</strong> Bereits genannte Antworten sind strengstens Tabu!
                  Schafft es <strong>niemand in der gesamten Runde</strong>, erhält der
                  <strong>ursprüngliche Startspieler der Frage</strong> den Punkt!
                }
              </p>
            </div>

            <div class="rule-card">
              <h4>4️⃣ {{ isEn() ? 'Using Special Cards' : 'Einsatz der Sonderkarten' }}</h4>
              <p>
                @if (isEn()) {
                  Once per round (before starting the 5s timer), the active player may play a
                  <strong>Switch card</strong> (draws a brand-new question) or a
                  <strong>Pass card</strong> (immediately passes the turn to the left neighbor).
                  First player to reach field <strong>{{ targetScore() }}</strong> wins!
                } @else {
                  Einmal pro Runde (vor dem Start des Timers) darf eine
                  <strong>„Wechseln“-Karte</strong> (neue Frage ziehen) oder eine
                  <strong>„Weitergeben“-Karte</strong> (Zug sofort an den linken Nachbarn abgeben)
                  gespielt werden. Wer zuerst Feld <strong>{{ targetScore() }}</strong> erreicht,
                  gewinnt!
                }
              </p>
            </div>
          </div>
        </section>
      }

      <!-- COLLAPSIBLE SETUP & PLAYERS MODAL -->
      @if (showSetupModal()) {
        <section class="setup-panel glass-panel">
          <div class="rules-head">
            <div>
              <h3>
                ⚙️
                {{
                  isEn()
                    ? 'Game Settings, Language & Players (2–8)'
                    : 'Spieleinstellungen, Sprache & Spieler (2–8)'
                }}
              </h3>
              <p>
                {{
                  isEn()
                    ? 'Add up to 8 players, choose the winning track length, or reset a match.'
                    : 'Füge 2 bis 8 Spieler hinzu, wähle die Zielfeld-Länge oder starte ein neues Match.'
                }}
              </p>
            </div>
            <button type="button" class="btn-secondary sm" (click)="showSetupModal.set(false)">
              ✓ {{ isEn() ? 'Done' : 'Fertig' }}
            </button>
          </div>

          <div class="setup-columns">
            <!-- PLAYER MANAGEMENT -->
            <div class="player-manager">
              <label class="cfg-label">
                {{ isEn() ? 'Players (Clockwise Order)' : 'Spieler (Reihenfolge im Uhrzeigersinn)' }}
              </label>
              <div class="player-edit-list">
                @for (p of players(); track p.id; let i = $index) {
                  <div class="player-edit-row">
                    <span class="p-dot" [style.background]="p.color">{{ i + 1 }}</span>
                    <input
                      type="text"
                      [ngModel]="p.name"
                      (ngModelChange)="updatePlayerName(p.id, $event)"
                      class="p-name-input"
                      [placeholder]="isEn() ? 'Player name' : 'Spielername'"
                    />
                    <span class="p-score-tag">
                      {{ p.score }} / {{ targetScore() }} · ⏭️{{ p.passCardsLeft }} 🔄{{
                        p.switchCardsLeft
                      }}
                    </span>
                    @if (players().length > 2) {
                      <button
                        type="button"
                        class="remove-p-btn"
                        (click)="removePlayer(p.id)"
                        [title]="isEn() ? 'Remove player' : 'Spieler entfernen'"
                      >
                        ✕
                      </button>
                    }
                  </div>
                }
              </div>

              @if (players().length < 8) {
                <div class="add-player-row">
                  <input
                    type="text"
                    [(ngModel)]="newPlayerName"
                    (keydown.enter)="addPlayer()"
                    class="p-name-input"
                    [placeholder]="
                      isEn() ? 'New player name (max 8)...' : 'Neuer Spielername (max. 8)...'
                    "
                  />
                  <button type="button" class="btn-secondary sm" (click)="addPlayer()">
                    + {{ isEn() ? 'Add' : 'Hinzufügen' }}
                  </button>
                </div>
              }
            </div>

            <!-- GAME OPTIONS -->
            <div class="rules-config">
              <label class="cfg-label">
                {{ isEn() ? 'Board Track & Language' : 'Zielfeld-Distanz & Sprache' }}
              </label>

              <div class="opt-row">
                <span>
                  {{
                    isEn()
                      ? 'Language (Questions & Interface):'
                      : 'Sprache (Fragekarten & Oberfläche):'
                  }}
                </span>
                <div class="pill-group">
                  <button
                    type="button"
                    class="opt-pill"
                    [class.active]="lang() === 'de'"
                    (click)="setLanguage('de')"
                  >
                    🇩🇪 Deutsch (Nenne 3 ...)
                  </button>
                  <button
                    type="button"
                    class="opt-pill"
                    [class.active]="lang() === 'en'"
                    (click)="setLanguage('en')"
                  >
                    🇬🇧 English (Name 3 ...)
                  </button>
                </div>
              </div>

              <div class="opt-row">
                <span>
                  {{
                    isEn()
                      ? 'Target Fields to Win (Finish Line):'
                      : 'Zielfeld zum Gesamtsieg (Spielbrett-Länge):'
                  }}
                </span>
                <div class="pill-group">
                  @for (goal of [5, 8, 10]; track goal) {
                    <button
                      type="button"
                      class="opt-pill"
                      [class.active]="targetScore() === goal"
                      (click)="targetScore.set(goal)"
                    >
                      🏁 {{ goal }} {{ isEn() ? 'Fields' : 'Felder' }}
                    </button>
                  }
                </div>
              </div>

              <div class="opt-row">
                <button type="button" class="btn-secondary sm" (click)="resetMatch()">
                  🔄
                  {{
                    isEn()
                      ? 'Reset Full Match (Scores & Special Cards)'
                      : 'Komplettes Spiel zurücksetzen (Punkte & Sonderkarten)'
                  }}
                </button>
              </div>
            </div>
          </div>
        </section>
      }

      <!-- CHAMPION BANNER -->
      @if (championPlayer(); as champ) {
        <section class="champion-banner glass-panel">
          <div class="champ-left">
            <span class="trophy-icon">🏆</span>
            <div>
              <h2>
                {{ champ.name }}
                {{
                  isEn() ? 'wins 5 Second Rule!' : 'gewinnt die 5 Sekunden Regel!'
                }}
              </h2>
              <p>
                {{
                  isEn()
                    ? 'Reached the finish line first with ' +
                      champ.score +
                      ' / ' +
                      targetScore() +
                      ' points!'
                    : 'Hat als Erster das Zielfeld mit ' +
                      champ.score +
                      ' / ' +
                      targetScore() +
                      ' Punkten erreicht!'
                }}
              </p>
            </div>
          </div>
          <button type="button" class="btn-primary" (click)="resetMatch()">
            🎉 {{ isEn() ? 'Play New Match' : 'Neues Spiel starten' }}
          </button>
        </section>
      }

      <!-- MAIN GAME ARENA -->
      <div class="fivesec-arena">
        <!-- LEFT COLUMN: QUESTION CARD, SPECIAL CARDS, PLAYERS & BOARD TRACK -->
        <div class="left-column">
          <!-- QUESTION CARD BOX -->
          <div class="question-card-box glass-panel">
            <div class="deck-header">
              <span class="deck-badge">
                🟨
                {{
                  isEn()
                    ? 'QUESTION CARD #' +
                      currentCard().id +
                      ' / ' +
                      totalDeckSize +
                      ' · ' +
                      currentCard().categoryEn
                    : 'FRAGEKARTE #' +
                      currentCard().id +
                      ' / ' +
                      totalDeckSize +
                      ' · ' +
                      currentCard().categoryDe
                }}
              </span>
              <button
                type="button"
                class="draw-btn"
                (click)="drawNextCard(true)"
                [disabled]="timerRunning()"
              >
                🎲 {{ isEn() ? 'Next Card' : 'Neue Karte' }}
              </button>
            </div>

            <!-- READER & ACTIVE PLAYER ROLES -->
            <div class="roles-banner">
              <div class="role-item">
                <span class="role-lbl">
                  📢 {{ isEn() ? 'Question Reader (Right):' : 'Vorleser (Rechter Nachbar):' }}
                </span>
                <strong [style.color]="readerPlayer().color">{{ readerPlayer().name }}</strong>
              </div>
              <div class="role-divider">→</div>
              <div class="role-item">
                <span class="role-lbl">
                  🎯 {{ isEn() ? 'On the Hot Seat:' : 'Auf dem heißen Stuhl:' }}
                </span>
                <strong [style.color]="activePlayer().color">{{ activePlayer().name }}</strong>
              </div>
            </div>

            <!-- THE "NENNE 3..." CARD -->
            <div class="nenne-drei-card" [class.passed-mode]="failedPlayersInRound().length > 0">
              <div class="card-top-pill">5 SECOND RULE</div>
              <h2 class="card-question-text">
                {{ displayQuestionText() }}
              </h2>
              @if (failedPlayersInRound().length > 0) {
                <div class="pass-warning-pill">
                  ⚠️
                  {{
                    isEn()
                      ? 'Question passed on! Previously named words are strictly FORBIDDEN!'
                      : 'Frage weitergewandert! Bereits genannte Antworten sind strengstens TABU!'
                  }}
                </div>
              }
            </div>

            <!-- OPTIONAL CUSTOM QUESTION -->
            <div class="custom-q-row">
              <input
                type="text"
                [(ngModel)]="customQuestion"
                [placeholder]="
                  isEn()
                    ? 'Or type your own question: Name 3 ...'
                    : 'Oder eigene Frage eingeben: Nenne 3 ...'
                "
                class="custom-q-input"
              />
            </div>

            <!-- SPECIAL CARDS ("WEITERGEBEN" & "WECHSELN") -->
            <div class="special-cards-box">
              <div class="sp-head">
                <span>
                  🃏
                  {{
                    isEn()
                      ? activePlayer().name + "'s Special Cards (Before Timer)"
                      : 'Sonderkarten von ' + activePlayer().name + ' (Vor Timer-Start)'
                  }}
                </span>
                @if (specialCardUsedThisTurn()) {
                  <span class="sp-used-tag">
                    {{ isEn() ? '1 card played this turn' : '1 Karte in diesem Zug genutzt' }}
                  </span>
                }
              </div>

              <div class="sp-buttons">
                <button
                  type="button"
                  class="sp-card-btn pass-card"
                  [disabled]="
                    timerRunning() ||
                    roundCompleted() ||
                    specialCardUsedThisTurn() ||
                    activePlayer().passCardsLeft <= 0
                  "
                  (click)="playPassCard()"
                >
                  <div class="sp-icon">⏭️</div>
                  <div class="sp-info">
                    <strong>
                      {{ isEn() ? 'PASS ("Weitergeben")' : 'WEITERGEBEN' }}
                    </strong>
                    <span>
                      {{
                        isEn()
                          ? 'Pass question to left neighbor'
                          : 'Frage sofort an linken Nachbarn'
                      }}
                    </span>
                  </div>
                  <span class="sp-badge">{{ activePlayer().passCardsLeft }}×</span>
                </button>

                <button
                  type="button"
                  class="sp-card-btn switch-card"
                  [disabled]="
                    timerRunning() ||
                    roundCompleted() ||
                    specialCardUsedThisTurn() ||
                    activePlayer().switchCardsLeft <= 0
                  "
                  (click)="playSwitchCard()"
                >
                  <div class="sp-icon">🔄</div>
                  <div class="sp-info">
                    <strong>
                      {{ isEn() ? 'SWITCH ("Wechseln")' : 'WECHSELN' }}
                    </strong>
                    <span>
                      {{ isEn() ? 'Draw a brand-new question' : 'Sofort neue Frage ziehen' }}
                    </span>
                  </div>
                  <span class="sp-badge">{{ activePlayer().switchCardsLeft }}×</span>
                </button>
              </div>
            </div>
          </div>

          <!-- PLAYERS & PROGRESS TRACK BOARD -->
          <div class="players-box glass-panel">
            <div class="players-head">
              <h3>
                🏁 {{ isEn() ? 'Game Board & Players' : 'Spielbrett & Punktestand' }}
              </h3>
              <span>{{ isEn() ? 'Goal:' : 'Ziel:' }} {{ targetScore() }}</span>
            </div>

            <div class="players-list">
              @for (p of players(); track p.id; let idx = $index) {
                <div
                  class="player-row"
                  [class.active-turn]="idx === activeTurnIndex()"
                  [class.origin-player]="idx === roundStarterIndex()"
                  (click)="selectPlayerManually(idx)"
                  [title]="
                    isEn() ? 'Click to set as active player' : 'Klicken, um Spieler zu aktivieren'
                  "
                >
                  <div class="p-top-line">
                    <div class="p-left">
                      <div class="p-avatar" [style.background]="p.color">{{ idx + 1 }}</div>
                      <div>
                        <div class="p-name">
                          {{ p.name }}
                          @if (idx === activeTurnIndex()) {
                            <span class="turn-chip">
                              {{ isEn() ? 'ACTIVE' : 'AM ZUG' }}
                            </span>
                          }
                          @if (idx === readerIndex()) {
                            <span class="role-chip">
                              📢 {{ isEn() ? 'Reader' : 'Vorleser' }}
                            </span>
                          }
                          @if (
                            idx === roundStarterIndex() && failedPlayersInRound().length > 0
                          ) {
                            <span class="origin-chip">
                              ⭐ {{ isEn() ? 'Round Starter' : 'Startspieler' }}
                            </span>
                          }
                        </div>
                        <div class="p-cards-mini">
                          <span>⏭️ {{ p.passCardsLeft }}×</span>
                          <span>🔄 {{ p.switchCardsLeft }}×</span>
                          @if (hasPlayerFailedThisRound(p.id)) {
                            <span class="failed-tag">
                              ⏳ {{ isEn() ? 'Passed in circle' : 'Weitergewandert' }}
                            </span>
                          }
                        </div>
                      </div>
                    </div>

                    <div class="p-score-num">
                      <strong>{{ p.score }}</strong> / {{ targetScore() }}
                    </div>
                  </div>

                  <!-- VISUAL STEP TRACK FOR EACH PLAYER -->
                  <div class="board-track">
                    @for (step of getTrackSteps(); track step) {
                      <div
                        class="track-step"
                        [class.filled]="step <= p.score"
                        [class.current-pawn]="step === p.score"
                        [style.borderColor]="step <= p.score ? p.color : ''"
                        [style.background]="step <= p.score ? p.color : ''"
                      >
                        @if (step === targetScore()) {
                          🏁
                        } @else {
                          {{ step }}
                        }
                      </div>
                    }
                  </div>
                </div>
              }
            </div>
          </div>
        </div>

        <!-- RIGHT COLUMN: THE 5-SECOND SPIRAL TIMER & INTERACTIVE COUNTER -->
        <div class="timer-column glass-panel">
          <!-- STATUS BANNER -->
          <div
            class="spiral-status-bar"
            [class.running]="timerRunning()"
            [class.urgent]="timerRunning() && timeLeft() <= 2.0"
            [class.won]="roundCompleted()"
          >
            <div class="status-info">
              <span class="status-kicker">
                @if (roundCompleted()) {
                  🎉 {{ isEn() ? 'ROUND WON!' : 'RUNDE GEWONNEN!' }}
                } @else if (timerRunning()) {
                  🔥
                  {{
                    isEn()
                      ? activePlayer().name.toUpperCase() + ' — NAME 3 THINGS NOW!'
                      : activePlayer().name.toUpperCase() + ' — NENNE JETZT 3 BEGRIFFE!'
                  }}
                } @else {
                  ⏳
                  {{
                    isEn()
                      ? 'READY TO FLIP THE 5-SECOND SPIRAL TIMER'
                      : 'BEREIT ZUM UMDREHEN DER 5-SEKUNDEN-RUTSCHE'
                  }}
                }
              </span>
              <p class="status-sub">{{ statusMessage() }}</p>
            </div>

            <div class="digital-clock" [class.danger]="timerRunning() && timeLeft() <= 1.8">
              {{ timeLeft().toFixed(1) }}s
            </div>
          </div>

          <!-- CENTERPIECE: THE 5-SECOND SPIRAL TUBE & COUNTER -->
          <div class="spiral-stage">
            <!-- 3D SPIRAL CYLINDER (KUGEL-RUTSCHE) -->
            <div
              class="spiral-cylinder"
              [class.active-glow]="timerRunning()"
              [class.urgent-glow]="timerRunning() && timeLeft() <= 1.8"
              (click)="!timerRunning() && !roundCompleted() ? startFiveSecondTimer() : null"
              [title]="
                isEn()
                  ? 'Click to flip the 5-Second Spiral Timer!'
                  : 'Klicken, um die 5-Sekunden-Kugelrutsche umzudrehen!'
              "
            >
              <div class="cylinder-cap top-cap">
                <span>5.0s</span>
              </div>

              <div class="cylinder-glass-body">
                <!-- SVG SPIRAL TRACK -->
                <svg class="spiral-svg" viewBox="0 0 140 320" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="coilGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stop-color="#f59e0b" />
                      <stop offset="50%" stop-color="#06b6d4" />
                      <stop offset="100%" stop-color="#f43f5e" />
                    </linearGradient>
                  </defs>
                  <!-- Back coils -->
                  <path
                    d="M 25 25 Q 70 45 115 65 Q 70 85 25 105 Q 70 125 115 145 Q 70 165 25 185 Q 70 205 115 225 Q 70 245 25 265 Q 70 285 115 300"
                    fill="none"
                    stroke="rgba(255,255,255,0.14)"
                    stroke-width="8"
                    stroke-linecap="round"
                  />
                  <!-- Glowing front spiral path -->
                  <path
                    d="M 25 25 C 125 40, 125 70, 25 85 C 125 100, 125 130, 25 145 C 125 160, 125 190, 25 205 C 125 220, 125 250, 25 265 C 125 280, 115 298, 70 305"
                    fill="none"
                    stroke="url(#coilGrad)"
                    stroke-width="5"
                    stroke-linecap="round"
                  />
                </svg>

                <!-- Center Core Rod -->
                <div class="cylinder-core-rod"></div>

                <!-- 3 METALLIC SPHERES SPIRALING DOWN -->
                @for (ballOffset of [0, 0.06, 0.12]; track ballOffset; let bIdx = $index) {
                  <div
                    class="metallic-ball"
                    [style.top.%]="getBallTopPercent(ballOffset)"
                    [style.left.%]="getBallLeftPercent(ballOffset)"
                    [class.rolling]="timerRunning()"
                  ></div>
                }

                <!-- Vertical Fill Bar indicator -->
                <div
                  class="cylinder-progress-glow"
                  [style.height.%]="(timeLeft() / 5.0) * 100"
                ></div>
              </div>

              <div class="cylinder-cap bottom-cap">
                <span>0.0s · ZONK</span>
              </div>
            </div>

            <!-- RIGHT OF SPIRAL: INTERACTIVE 3-ITEM COUNTER & CONTROLS -->
            <div class="counter-workspace">
              <!-- STEP 1: FLIP TIMER BUTTON -->
              <div class="flip-action-row">
                @if (!timerRunning() && !roundCompleted()) {
                  <button
                    type="button"
                    class="flip-timer-btn"
                    (click)="startFiveSecondTimer()"
                  >
                    <span class="flip-icon">⏳</span>
                    <div class="flip-txt">
                      <strong>
                        {{
                          isEn()
                            ? 'FLIP 5-SECOND TIMER! [Enter]'
                            : '5-SEKUNDEN-TIMER STARTEN! [Enter]'
                        }}
                      </strong>
                      <span>
                        {{
                          isEn()
                            ? 'Starts the 5.0s spiral slide for ' + activePlayer().name
                            : 'Startet die 5,0s Kugel-Rutsche für ' + activePlayer().name
                        }}
                      </span>
                    </div>
                  </button>
                } @else if (timerRunning()) {
                  <button
                    type="button"
                    class="shout-word-btn"
                    (click)="incrementNamedWord()"
                  >
                    <span class="shout-icon">🗣️</span>
                    <div class="shout-txt">
                      <strong>
                        {{
                          isEn()
                            ? 'WORD NAMED! (+1) [Spacebar]'
                            : 'WORT GENANNT! (+1) [Leertaste]'
                        }}
                      </strong>
                      <span>
                        {{ namedCount() }} / 3
                        {{
                          isEn()
                            ? 'items named — hit 3 before 0.0s!'
                            : 'Begriffe genannt — schaffe 3 vor 0,0s!'
                        }}
                      </span>
                    </div>
                  </button>
                } @else if (roundCompleted()) {
                  <button
                    type="button"
                    class="next-round-btn"
                    (click)="startNextRound()"
                  >
                    <span>🎉</span>
                    <strong>
                      {{
                        isEn()
                          ? 'Next Question Card & Next Player →'
                          : 'Nächste Fragekarte & Nächster Spieler →'
                      }}
                    </strong>
                  </button>
                }
              </div>

              <!-- 3 BIG INTERACTIVE PILLS (BEGRIFF 1, 2, 3) -->
              <div class="three-items-grid">
                @for (slot of [1, 2, 3]; track slot) {
                  <button
                    type="button"
                    class="item-pill-btn"
                    [class.checked]="namedCount() >= slot"
                    [disabled]="roundCompleted()"
                    (click)="toggleItemSlot(slot)"
                  >
                    <span class="slot-circle">
                      {{ namedCount() >= slot ? '✓' : slot }}
                    </span>
                    <div class="slot-label">
                      <strong>
                        {{ isEn() ? 'Item ' + slot : 'Begriff ' + slot }}
                      </strong>
                      <span>
                        {{
                          namedCount() >= slot
                            ? isEn()
                              ? 'Valid!'
                              : 'Genannt!'
                            : isEn()
                              ? 'Click / Space'
                              : 'Klick / Leertaste'
                        }}
                      </span>
                    </div>
                  </button>
                }
              </div>

              <!-- OPTIONAL INPUT FOR LOGGING SPOKEN / FORBIDDEN WORDS -->
              <div class="log-word-row">
                <input
                  type="text"
                  [(ngModel)]="spokenWordInput"
                  (keydown.enter)="logWordAndCount()"
                  class="spoken-input"
                  [placeholder]="
                    isEn()
                      ? 'Optional: Type spoken word & press Enter (+1 & adds to Taboo list)...'
                      : 'Optional: Genanntes Wort eintippen & Enter (+1 & auf Tabu-Liste)...'
                  "
                />
                <button
                  type="button"
                  class="btn-secondary sm"
                  (click)="logWordAndCount()"
                >
                  + {{ isEn() ? 'Count & Log' : 'Zählen & Loggen' }}
                </button>
              </div>

              <!-- MANUAL REFEREE / PASS ACTIONS -->
              <div class="referee-actions">
                @if (!roundCompleted()) {
                  <button
                    type="button"
                    class="fail-pass-btn"
                    (click)="handleTimeOutOrFail()"
                  >
                    🚨
                    {{
                      isEn()
                        ? 'Time Up / Less than 3 → Pass Question Clockwise'
                        : 'Zeit abgelaufen / Nicht geschafft → Frage im Kreis weitergeben'
                    }}
                  </button>

                  <button
                    type="button"
                    class="instant-win-btn"
                    (click)="completeRoundSuccess()"
                  >
                    ✅
                    {{
                      isEn()
                        ? 'All 3 Named! (+1 Point for ' + activePlayer().name + ')'
                        : 'Alle 3 geschafft! (+1 Punkt für ' + activePlayer().name + ')'
                    }}
                  </button>
                }
              </div>

              <!-- FORBIDDEN / PREVIOUSLY NAMED WORDS IN THIS ROUND -->
              <div class="forbidden-box">
                <div class="fb-head">
                  <span>
                    🚫
                    {{
                      isEn()
                        ? 'Taboo / Already Named Words in This Round (' +
                          forbiddenWords().length +
                          ')'
                        : 'Tabu-Wörter / Bereits genannt in dieser Runde (' +
                          forbiddenWords().length +
                          ')'
                    }}
                  </span>
                  @if (failedPlayersInRound().length > 0) {
                    <span class="circle-count">
                      🔄 {{ failedPlayersInRound().length }} / {{ players().length }}
                      {{ isEn() ? 'players tried' : 'Spieler versucht' }}
                    </span>
                  }
                </div>

                @if (forbiddenWords().length === 0) {
                  <p class="fb-empty">
                    {{
                      isEn()
                        ? 'No words logged yet. If a player fails, their named words cannot be reused by the next player!'
                        : 'Noch keine Wörter notiert. Wenn die Frage weiterwandert, dürfen bereits genannte Antworten nicht wiederholt werden!'
                    }}
                  </p>
                } @else {
                  <div class="fb-chips">
                    @for (entry of forbiddenWords(); track $index) {
                      <span class="fb-chip" [style.borderColor]="entry.playerColor">
                        <strong [style.color]="entry.playerColor">{{ entry.player }}:</strong>
                        {{ entry.word }}
                      </span>
                    }
                  </div>
                }
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: `
    :host {
      display: block;
      min-height: 100dvh;
      background:
        radial-gradient(circle at 18% 12%, rgba(245, 158, 11, 0.14), transparent 36%),
        radial-gradient(circle at 85% 20%, rgba(6, 182, 212, 0.14), transparent 40%),
        radial-gradient(circle at 50% 90%, rgba(244, 63, 94, 0.1), transparent 45%),
        var(--bg-primary);
      color: var(--text-primary);
      padding: 1.4rem 2rem 3rem;
    }

    .fivesec-page {
      max-width: 1380px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 1.3rem;
    }

    /* TOPBAR */
    .topbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .back-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.52rem 1rem;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--border-subtle);
      color: var(--text-secondary);
      font-size: 0.85rem;
      font-weight: 600;
      transition: all 0.2s ease;
    }

    .back-btn:hover {
      color: var(--text-primary);
      border-color: var(--border-highlight);
      background: rgba(255, 255, 255, 0.1);
    }

    .top-controls {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.65rem;
    }

    .lang-switch-group {
      display: inline-flex;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid var(--border-subtle);
      border-radius: 999px;
      padding: 0.18rem;
      gap: 0.2rem;
    }

    .lang-btn {
      border: none;
      background: transparent;
      color: var(--text-secondary);
      font-size: 0.78rem;
      font-weight: 700;
      padding: 0.34rem 0.68rem;
      border-radius: 999px;
      cursor: pointer;
      transition: all 0.18s ease;
    }

    .lang-btn.active {
      background: linear-gradient(135deg, #f59e0b, #f43f5e);
      color: #fff;
      box-shadow: 0 2px 10px rgba(245, 158, 11, 0.45);
    }

    .switch-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.48rem 0.95rem;
      border-radius: 999px;
      border: 1px solid var(--border-subtle);
      background: rgba(255, 255, 255, 0.04);
      color: var(--text-secondary);
      font-size: 0.8rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .switch-pill.on {
      background: rgba(16, 185, 129, 0.14);
      border-color: rgba(16, 185, 129, 0.4);
      color: #6ee7b7;
    }

    .switch-pill .led {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: currentColor;
      box-shadow: 0 0 8px currentColor;
    }

    .btn-secondary.sm {
      padding: 0.48rem 0.9rem;
      font-size: 0.82rem;
    }

    /* RULES & SETUP MODALS */
    .rules-panel,
    .setup-panel {
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1.15rem;
      border-color: rgba(245, 158, 11, 0.35);
    }

    .rules-head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1rem;
    }

    .rules-head h3 {
      margin: 0;
      font-size: 1.15rem;
      font-family: var(--font-display);
    }

    .rules-head p {
      margin: 0.2rem 0 0;
      font-size: 0.85rem;
      color: var(--text-secondary);
    }

    .rules-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 0.9rem;
    }

    .rule-card {
      padding: 1rem;
      border-radius: 14px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--border-subtle);
    }

    .rule-card h4 {
      margin: 0 0 0.4rem;
      font-size: 0.95rem;
      color: #fcd34d;
    }

    .rule-card p {
      margin: 0;
      font-size: 0.82rem;
      line-height: 1.5;
      color: var(--text-secondary);
    }

    .setup-columns {
      display: grid;
      grid-template-columns: 1fr 1.2fr;
      gap: 1.5rem;
    }

    .cfg-label {
      display: block;
      font-size: 0.82rem;
      font-weight: 700;
      color: var(--text-secondary);
      margin-bottom: 0.65rem;
      text-transform: uppercase;
    }

    .player-edit-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      margin-bottom: 0.75rem;
    }

    .player-edit-row {
      display: flex;
      align-items: center;
      gap: 0.55rem;
    }

    .p-dot {
      width: 26px;
      height: 26px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      font-size: 0.75rem;
      font-weight: 700;
      color: #fff;
      flex-shrink: 0;
    }

    .p-name-input {
      flex: 1;
      padding: 0.5rem 0.75rem;
      border-radius: 10px;
      border: 1px solid var(--border-subtle);
      background: rgba(0, 0, 0, 0.35);
      color: var(--text-primary);
      font-size: 0.86rem;
    }

    .p-score-tag {
      font-size: 0.78rem;
      color: var(--text-secondary);
      white-space: nowrap;
    }

    .remove-p-btn {
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.35);
      color: #fca5a5;
      border-radius: 8px;
      padding: 0.35rem 0.55rem;
      cursor: pointer;
    }

    .add-player-row {
      display: flex;
      gap: 0.5rem;
    }

    .rules-config {
      display: flex;
      flex-direction: column;
      gap: 0.95rem;
    }

    .opt-row {
      display: flex;
      flex-direction: column;
      gap: 0.45rem;
      font-size: 0.84rem;
      color: var(--text-secondary);
    }

    .pill-group {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .opt-pill {
      padding: 0.48rem 0.85rem;
      border-radius: 10px;
      border: 1px solid var(--border-subtle);
      background: rgba(255, 255, 255, 0.04);
      color: var(--text-secondary);
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
    }

    .opt-pill.active {
      background: rgba(245, 158, 11, 0.22);
      border-color: #f59e0b;
      color: #fff;
    }

    /* CHAMPION BANNER */
    .champion-banner {
      padding: 1.4rem 1.8rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
      background: linear-gradient(135deg, rgba(245, 158, 11, 0.24), rgba(6, 182, 212, 0.22));
      border-color: rgba(245, 158, 11, 0.6);
    }

    .champ-left {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .trophy-icon {
      font-size: 2.6rem;
    }

    .champ-left h2 {
      margin: 0;
      font-family: var(--font-display);
      font-size: 1.45rem;
    }

    .champ-left p {
      margin: 0.2rem 0 0;
      color: var(--text-secondary);
      font-size: 0.9rem;
    }

    /* MAIN ARENA */
    .fivesec-arena {
      display: grid;
      grid-template-columns: 440px 1fr;
      gap: 1.5rem;
      align-items: start;
    }

    .left-column {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .question-card-box {
      padding: 1.35rem;
      display: flex;
      flex-direction: column;
      gap: 0.95rem;
    }

    .deck-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .deck-badge {
      font-size: 0.74rem;
      font-weight: 800;
      letter-spacing: 0.06em;
      color: #fcd34d;
    }

    .draw-btn {
      padding: 0.42rem 0.85rem;
      border-radius: 10px;
      border: 1px solid rgba(245, 158, 11, 0.45);
      background: rgba(245, 158, 11, 0.16);
      color: #fde68a;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
    }

    .draw-btn:hover:not(:disabled) {
      background: rgba(245, 158, 11, 0.28);
    }

    .draw-btn:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }

    .roles-banner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      padding: 0.6rem 0.85rem;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--border-subtle);
      font-size: 0.8rem;
    }

    .role-item {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
    }

    .role-lbl {
      font-size: 0.68rem;
      color: var(--text-muted);
      text-transform: uppercase;
      font-weight: 700;
    }

    .role-divider {
      color: var(--text-muted);
      font-weight: 700;
    }

    /* THE YELLOW/CYAN "NENNE 3..." QUESTION CARD */
    .nenne-drei-card {
      padding: 1.35rem 1.2rem;
      border-radius: 18px;
      background: linear-gradient(145deg, rgba(245, 158, 11, 0.2), rgba(15, 23, 42, 0.92));
      border: 2px solid rgba(245, 158, 11, 0.55);
      box-shadow: 0 12px 30px rgba(0, 0, 0, 0.35);
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.65rem;
    }

    .nenne-drei-card.passed-mode {
      border-color: #f43f5e;
      background: linear-gradient(145deg, rgba(244, 63, 94, 0.22), rgba(15, 23, 42, 0.92));
    }

    .card-top-pill {
      font-size: 0.68rem;
      font-weight: 900;
      letter-spacing: 0.14em;
      padding: 0.22rem 0.7rem;
      border-radius: 999px;
      background: rgba(245, 158, 11, 0.25);
      color: #fde68a;
      border: 1px solid rgba(245, 158, 11, 0.45);
    }

    .card-question-text {
      margin: 0;
      font-family: var(--font-display);
      font-size: 1.32rem;
      line-height: 1.35;
      color: #ffffff;
    }

    .pass-warning-pill {
      font-size: 0.76rem;
      font-weight: 700;
      color: #fecdd3;
      background: rgba(244, 63, 94, 0.22);
      border: 1px solid rgba(244, 63, 94, 0.5);
      padding: 0.38rem 0.75rem;
      border-radius: 10px;
    }

    .custom-q-input {
      width: 100%;
      padding: 0.55rem 0.8rem;
      border-radius: 10px;
      border: 1px solid var(--border-subtle);
      background: rgba(0, 0, 0, 0.35);
      color: var(--text-primary);
      font-size: 0.82rem;
    }

    /* SPECIAL CARDS */
    .special-cards-box {
      display: flex;
      flex-direction: column;
      gap: 0.55rem;
      padding-top: 0.3rem;
    }

    .sp-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.76rem;
      font-weight: 700;
      color: var(--text-secondary);
    }

    .sp-used-tag {
      font-size: 0.7rem;
      color: #fcd34d;
    }

    .sp-buttons {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.6rem;
    }

    .sp-card-btn {
      display: flex;
      align-items: center;
      gap: 0.55rem;
      padding: 0.65rem 0.75rem;
      border-radius: 12px;
      border: 1px solid var(--border-subtle);
      background: rgba(255, 255, 255, 0.04);
      color: var(--text-primary);
      text-align: left;
      cursor: pointer;
      transition: all 0.18s ease;
    }

    .sp-card-btn.pass-card:hover:not(:disabled) {
      border-color: #06b6d4;
      background: rgba(6, 182, 212, 0.15);
      transform: translateY(-1px);
    }

    .sp-card-btn.switch-card:hover:not(:disabled) {
      border-color: #f59e0b;
      background: rgba(245, 158, 11, 0.15);
      transform: translateY(-1px);
    }

    .sp-card-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .sp-icon {
      font-size: 1.25rem;
    }

    .sp-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.1rem;
    }

    .sp-info strong {
      font-size: 0.76rem;
      letter-spacing: 0.03em;
    }

    .sp-info span {
      font-size: 0.68rem;
      color: var(--text-secondary);
      line-height: 1.2;
    }

    .sp-badge {
      padding: 0.2rem 0.48rem;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.1);
      font-family: var(--font-mono);
      font-size: 0.78rem;
      font-weight: 800;
    }

    /* PLAYERS & BOARD TRACK */
    .players-box {
      padding: 1.35rem;
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
    }

    .players-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .players-head h3 {
      margin: 0;
      font-size: 1rem;
      font-family: var(--font-display);
    }

    .players-head span {
      font-size: 0.8rem;
      color: var(--text-secondary);
      font-weight: 700;
    }

    .players-list {
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
    }

    .player-row {
      display: flex;
      flex-direction: column;
      gap: 0.55rem;
      padding: 0.75rem 0.9rem;
      border-radius: 14px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--border-subtle);
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .player-row.active-turn {
      background: rgba(245, 158, 11, 0.13);
      border-color: #f59e0b;
      box-shadow: 0 0 20px rgba(245, 158, 11, 0.18);
    }

    .p-top-line {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .p-left {
      display: flex;
      align-items: center;
      gap: 0.7rem;
    }

    .p-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      font-weight: 800;
      font-size: 0.82rem;
      color: #fff;
      flex-shrink: 0;
    }

    .p-name {
      font-weight: 700;
      font-size: 0.9rem;
      display: flex;
      align-items: center;
      gap: 0.35rem;
      flex-wrap: wrap;
    }

    .turn-chip {
      font-size: 0.63rem;
      padding: 0.1rem 0.42rem;
      border-radius: 5px;
      background: #f59e0b;
      color: #090d16;
      font-weight: 800;
    }

    .role-chip {
      font-size: 0.63rem;
      padding: 0.1rem 0.4rem;
      border-radius: 5px;
      background: rgba(255, 255, 255, 0.08);
      color: var(--text-secondary);
    }

    .origin-chip {
      font-size: 0.63rem;
      padding: 0.1rem 0.4rem;
      border-radius: 5px;
      background: rgba(6, 182, 212, 0.2);
      color: #67e8f9;
    }

    .p-cards-mini {
      display: flex;
      gap: 0.55rem;
      font-size: 0.72rem;
      color: var(--text-secondary);
      margin-top: 0.15rem;
    }

    .failed-tag {
      color: #fda4af;
      font-weight: 600;
    }

    .p-score-num {
      font-family: var(--font-display);
      font-size: 0.95rem;
      color: var(--text-secondary);
    }

    .p-score-num strong {
      font-size: 1.15rem;
      color: var(--text-primary);
    }

    .board-track {
      display: flex;
      gap: 0.28rem;
      align-items: center;
    }

    .track-step {
      flex: 1;
      height: 22px;
      border-radius: 6px;
      border: 1px solid rgba(255, 255, 255, 0.12);
      background: rgba(0, 0, 0, 0.3);
      display: grid;
      place-items: center;
      font-size: 0.66rem;
      font-weight: 700;
      color: var(--text-muted);
      transition: all 0.25s ease;
    }

    .track-step.filled {
      color: #fff;
      font-weight: 800;
    }

    .track-step.current-pawn {
      transform: scale(1.08);
      box-shadow: 0 0 10px rgba(255, 255, 255, 0.35);
    }

    /* ============================================================
       RIGHT COLUMN: THE 5-SECOND SPIRAL TIMER (KUGEL-RUTSCHE)
       ============================================================ */
    .timer-column {
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1.35rem;
    }

    .spiral-status-bar {
      width: 100%;
      padding: 0.95rem 1.25rem;
      border-radius: 16px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid var(--border-subtle);
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      transition: all 0.2s ease;
    }

    .spiral-status-bar.running {
      background: rgba(245, 158, 11, 0.14);
      border-color: rgba(245, 158, 11, 0.5);
    }

    .spiral-status-bar.urgent {
      background: rgba(244, 63, 94, 0.22);
      border-color: #f43f5e;
      animation: pulseUrgent 0.45s infinite alternate;
    }

    .spiral-status-bar.won {
      background: rgba(16, 185, 129, 0.18);
      border-color: #10b981;
    }

    @keyframes pulseUrgent {
      from {
        box-shadow: 0 0 10px rgba(244, 63, 94, 0.25);
      }
      to {
        box-shadow: 0 0 26px rgba(244, 63, 94, 0.65);
      }
    }

    .status-kicker {
      font-size: 0.78rem;
      font-weight: 800;
      letter-spacing: 0.06em;
      color: #fde68a;
    }

    .status-sub {
      margin: 0.22rem 0 0;
      font-size: 0.86rem;
      color: var(--text-secondary);
    }

    .digital-clock {
      font-family: var(--font-mono);
      font-size: 2.3rem;
      font-weight: 900;
      color: #fcd34d;
      min-width: 105px;
      text-align: right;
    }

    .digital-clock.danger {
      color: #fb7185;
    }

    /* SPIRAL STAGE */
    .spiral-stage {
      display: grid;
      grid-template-columns: 185px 1fr;
      gap: 1.6rem;
      align-items: stretch;
    }

    /* 3D SPIRAL TUBE */
    .spiral-cylinder {
      display: flex;
      flex-direction: column;
      align-items: center;
      cursor: pointer;
      user-select: none;
    }

    .cylinder-cap {
      width: 156px;
      height: 36px;
      border-radius: 14px;
      background: linear-gradient(135deg, #f59e0b, #d97706);
      border: 2px solid rgba(255, 255, 255, 0.35);
      display: grid;
      place-items: center;
      font-family: var(--font-mono);
      font-size: 0.76rem;
      font-weight: 900;
      color: #090d16;
      box-shadow: 0 6px 18px rgba(0, 0, 0, 0.45);
      z-index: 2;
    }

    .cylinder-cap.bottom-cap {
      background: linear-gradient(135deg, #06b6d4, #2563eb);
      color: #fff;
    }

    .cylinder-glass-body {
      position: relative;
      width: 140px;
      height: 330px;
      background: linear-gradient(
        90deg,
        rgba(255, 255, 255, 0.08) 0%,
        rgba(15, 23, 42, 0.75) 35%,
        rgba(15, 23, 42, 0.85) 65%,
        rgba(255, 255, 255, 0.12) 100%
      );
      border-left: 2px solid rgba(255, 255, 255, 0.22);
      border-right: 2px solid rgba(255, 255, 255, 0.22);
      overflow: hidden;
      box-shadow: inset 0 0 28px rgba(6, 182, 212, 0.2);
    }

    .spiral-cylinder.active-glow .cylinder-glass-body {
      border-color: #f59e0b;
      box-shadow:
        0 0 28px rgba(245, 158, 11, 0.35),
        inset 0 0 30px rgba(245, 158, 11, 0.22);
    }

    .spiral-cylinder.urgent-glow .cylinder-glass-body {
      border-color: #f43f5e;
      box-shadow:
        0 0 32px rgba(244, 63, 94, 0.5),
        inset 0 0 32px rgba(244, 63, 94, 0.3);
    }

    .spiral-svg {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      z-index: 2;
    }

    .cylinder-core-rod {
      position: absolute;
      top: 0;
      bottom: 0;
      left: 50%;
      width: 16px;
      transform: translateX(-50%);
      background: linear-gradient(90deg, #334155, #94a3b8, #1e293b);
      opacity: 0.65;
      z-index: 1;
    }

    .cylinder-progress-glow {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      background: linear-gradient(to top, rgba(6, 182, 212, 0.22), rgba(245, 158, 11, 0.18));
      transition: height 0.06s linear;
      z-index: 0;
    }

    .metallic-ball {
      position: absolute;
      width: 22px;
      height: 22px;
      margin-left: -11px;
      margin-top: -11px;
      border-radius: 50%;
      background: radial-gradient(circle at 30% 30%, #ffffff, #cbd5e1 45%, #475569 85%, #0f172a);
      box-shadow:
        0 3px 10px rgba(0, 0, 0, 0.7),
        0 0 12px rgba(255, 255, 255, 0.65);
      z-index: 4;
      transition:
        top 0.05s linear,
        left 0.05s linear;
    }

    /* COUNTER WORKSPACE */
    .counter-workspace {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 1rem;
    }

    .flip-timer-btn,
    .shout-word-btn,
    .next-round-btn {
      width: 100%;
      padding: 1.15rem 1.35rem;
      border-radius: 18px;
      border: 2px solid rgba(255, 255, 255, 0.22);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      cursor: pointer;
      color: #fff;
      text-align: left;
      transition: all 0.18s ease;
    }

    .flip-timer-btn {
      background: linear-gradient(135deg, #f59e0b 0%, #ea580c 55%, #e11d48 100%);
      box-shadow: 0 12px 28px -6px rgba(245, 158, 11, 0.55);
    }

    .flip-timer-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 16px 34px -4px rgba(245, 158, 11, 0.75);
    }

    .shout-word-btn {
      background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 50%, #8b5cf6 100%);
      box-shadow: 0 12px 30px -6px rgba(6, 182, 212, 0.6);
      animation: pulseButton 0.8s infinite alternate;
    }

    @keyframes pulseButton {
      from {
        transform: scale(1);
      }
      to {
        transform: scale(1.015);
      }
    }

    .next-round-btn {
      background: linear-gradient(135deg, #10b981, #059669);
      font-size: 1.05rem;
      box-shadow: 0 10px 26px rgba(16, 185, 129, 0.45);
    }

    .flip-icon,
    .shout-icon {
      font-size: 2.1rem;
    }

    .flip-txt,
    .shout-txt {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }

    .flip-txt strong,
    .shout-txt strong {
      font-family: var(--font-display);
      font-size: 1.15rem;
      letter-spacing: 0.02em;
    }

    .flip-txt span,
    .shout-txt span {
      font-size: 0.82rem;
      color: rgba(255, 255, 255, 0.86);
    }

    /* 3 ITEM PILLS */
    .three-items-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.75rem;
    }

    .item-pill-btn {
      padding: 0.9rem 0.75rem;
      border-radius: 16px;
      border: 2px solid var(--border-subtle);
      background: rgba(255, 255, 255, 0.04);
      color: var(--text-primary);
      display: flex;
      align-items: center;
      gap: 0.65rem;
      cursor: pointer;
      transition: all 0.18s ease;
    }

    .item-pill-btn:hover:not(:disabled) {
      border-color: #f59e0b;
      background: rgba(245, 158, 11, 0.12);
    }

    .item-pill-btn.checked {
      background: rgba(16, 185, 129, 0.2);
      border-color: #10b981;
      box-shadow: 0 0 18px rgba(16, 185, 129, 0.28);
    }

    .slot-circle {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.1);
      display: grid;
      place-items: center;
      font-weight: 900;
      font-size: 0.95rem;
      flex-shrink: 0;
    }

    .item-pill-btn.checked .slot-circle {
      background: #10b981;
      color: #06281e;
    }

    .slot-label {
      display: flex;
      flex-direction: column;
      text-align: left;
      gap: 0.1rem;
    }

    .slot-label strong {
      font-size: 0.88rem;
    }

    .slot-label span {
      font-size: 0.7rem;
      color: var(--text-secondary);
    }

    /* LOG WORD INPUT ROW */
    .log-word-row {
      display: flex;
      gap: 0.55rem;
    }

    .spoken-input {
      flex: 1;
      padding: 0.58rem 0.85rem;
      border-radius: 12px;
      border: 1px solid var(--border-subtle);
      background: rgba(0, 0, 0, 0.35);
      color: var(--text-primary);
      font-size: 0.84rem;
    }

    /* REFEREE BUTTONS */
    .referee-actions {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.65rem;
    }

    .fail-pass-btn,
    .instant-win-btn {
      padding: 0.68rem 0.85rem;
      border-radius: 12px;
      font-size: 0.8rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.18s ease;
    }

    .fail-pass-btn {
      background: rgba(244, 63, 94, 0.15);
      border: 1px solid rgba(244, 63, 94, 0.45);
      color: #fecdd3;
    }

    .fail-pass-btn:hover {
      background: rgba(244, 63, 94, 0.26);
    }

    .instant-win-btn {
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.45);
      color: #a7f3d0;
    }

    .instant-win-btn:hover {
      background: rgba(16, 185, 129, 0.26);
    }

    /* FORBIDDEN WORDS BOX */
    .forbidden-box {
      padding: 0.9rem 1rem;
      border-radius: 14px;
      background: rgba(0, 0, 0, 0.28);
      border: 1px solid var(--border-subtle);
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .fb-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.76rem;
      font-weight: 700;
      color: #fda4af;
    }

    .circle-count {
      color: #fcd34d;
    }

    .fb-empty {
      margin: 0;
      font-size: 0.78rem;
      color: var(--text-muted);
    }

    .fb-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
    }

    .fb-chip {
      padding: 0.25rem 0.6rem;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--border-subtle);
      font-size: 0.75rem;
    }

    @media (max-width: 1080px) {
      .fivesec-arena {
        grid-template-columns: 1fr;
      }
      .setup-columns {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 640px) {
      :host {
        padding: 1rem;
      }
      .spiral-stage {
        grid-template-columns: 1fr;
        justify-items: center;
      }
      .three-items-grid,
      .referee-actions,
      .sp-buttons {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class FiveSecondsGameComponent implements OnDestroy {
  readonly lang = signal<FiveSecLang>('de');
  readonly isEn = computed(() => this.lang() === 'en');

  readonly audioOn = signal(true);
  readonly showRulesModal = signal(false);
  readonly showSetupModal = signal(false);

  // Target score to win the game (default 5 fields, configurable 5 / 8 / 10)
  readonly targetScore = signal(5);

  // Players list (2 to 8 players) — persisted in localStorage across all games
  readonly players = signal<FiveSecPlayer[]>(
    loadSavedPlayerNames(['Spieler 1', 'Spieler 2', 'Spieler 3']).map((name, idx) => ({
      id: idx + 1,
      name,
      color: PLAYER_COLORS[idx % PLAYER_COLORS.length],
      score: 0,
      passCardsLeft: 2,
      switchCardsLeft: 2,
    }))
  );
  newPlayerName = '';

  // Question Deck state
  readonly totalDeckSize = FIVE_SEC_DECK.length;
  readonly deckIndex = signal(0);
  readonly currentCard = computed(() => FIVE_SEC_DECK[this.deckIndex() % FIVE_SEC_DECK.length]);
  customQuestion = '';

  readonly displayQuestionText = computed(() => {
    if (this.customQuestion.trim()) {
      return this.customQuestion.trim();
    }
    return this.isEn() ? this.currentCard().en : this.currentCard().de;
  });

  // Turn & Circle Passing tracking
  readonly activeTurnIndex = signal(0);
  readonly roundStarterIndex = signal(0); // Player who originally received the card in this round
  readonly failedPlayersInRound = signal<number[]>([]); // IDs of players who failed this question in the circle
  readonly specialCardUsedThisTurn = signal(false);

  readonly activePlayer = computed(() => {
    const list = this.players();
    return list[this.activeTurnIndex() % list.length] ?? list[0];
  });

  // Reader is the right neighbor (previous index in clockwise circle)
  readonly readerIndex = computed(() => {
    const len = this.players().length;
    return (this.activeTurnIndex() - 1 + len) % len;
  });

  readonly readerPlayer = computed(() => {
    const list = this.players();
    return list[this.readerIndex()] ?? list[0];
  });

  readonly championPlayer = computed(() => {
    const goal = this.targetScore();
    return this.players().find((p) => p.score >= goal) ?? null;
  });

  // 5.0-Second Spiral Timer State
  readonly timeLeft = signal(5.0);
  readonly timerRunning = signal(false);
  readonly roundCompleted = signal(false);
  readonly namedCount = signal(0); // 0, 1, 2, or 3 items named

  readonly forbiddenWords = signal<ForbiddenWordEntry[]>([]);
  spokenWordInput = '';

  readonly statusMessage = signal(
    'Der Vorleser liest die „Nenne 3...“-Karte vor. Klicke danach auf die Kugel-Rutsche!',
  );

  private timerIntervalId: ReturnType<typeof setInterval> | null = null;
  private lastHalfSecondTick = 10;
  private audioCtx: AudioContext | null = null;

  @HostListener('window:keydown', ['$event'])
  handleKeydown(event: KeyboardEvent): void {
    const tag = (event.target as HTMLElement | null)?.tagName?.toLowerCase();
    if (tag === 'input' || tag === 'textarea') {
      return;
    }

    if (event.code === 'Space') {
      event.preventDefault();
      if (this.timerRunning()) {
        this.incrementNamedWord();
      } else if (!this.roundCompleted()) {
        this.startFiveSecondTimer();
      }
    } else if (event.code === 'Enter') {
      if (!this.timerRunning() && !this.roundCompleted()) {
        event.preventDefault();
        this.startFiveSecondTimer();
      }
    }
  }

  setLanguage(newLang: FiveSecLang): void {
    this.lang.set(newLang);
    if (!this.timerRunning() && !this.roundCompleted()) {
      this.statusMessage.set(
        newLang === 'en'
          ? 'The Reader reads the "Name 3..." card aloud. Then flip the 5-Second Spiral Timer!'
          : 'Der Vorleser liest die „Nenne 3...“-Karte vor. Klicke danach auf die Kugel-Rutsche!',
      );
    }
  }

  toggleAudio(): void {
    this.audioOn.set(!this.audioOn());
  }

  getTrackSteps(): number[] {
    const total = this.targetScore();
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  // Spiral Ball Coordinates (0.0 at top = 5.0s, 1.0 at bottom = 0.0s)
  getBallTopPercent(offset: number): number {
    const progress = Math.min(1, Math.max(0, (5.0 - this.timeLeft()) / 5.0 + offset));
    return 8 + progress * 84;
  }

  getBallLeftPercent(offset: number): number {
    const progress = Math.min(1, Math.max(0, (5.0 - this.timeLeft()) / 5.0 + offset));
    // 5 full spiral coils down the cylinder
    const angle = progress * Math.PI * 10;
    return 50 + Math.sin(angle) * 32;
  }

  hasPlayerFailedThisRound(playerId: number): boolean {
    return this.failedPlayersInRound().includes(playerId);
  }

  // Start the 5.0s countdown
  startFiveSecondTimer(): void {
    if (this.roundCompleted()) return;
    this.clearTimer();

    this.timeLeft.set(5.0);
    this.namedCount.set(0);
    this.timerRunning.set(true);
    this.lastHalfSecondTick = 10;

    this.playSpiralSlideSound();

    const pName = this.activePlayer().name;
    this.statusMessage.set(
      this.isEn()
        ? `${pName} has 5.0 seconds! Press [Spacebar] or click for each valid answer!`
        : `${pName} hat 5,0 Sekunden! Drücke [Leertaste] oder klicke für jede genannte Antwort!`,
    );

    const startTime = performance.now();
    const durationMs = 5000;

    this.timerIntervalId = setInterval(() => {
      const elapsed = performance.now() - startTime;
      const remaining = Math.max(0, (durationMs - elapsed) / 1000);
      this.timeLeft.set(remaining);

      const halfSecBucket = Math.ceil(remaining * 2);
      if (halfSecBucket < this.lastHalfSecondTick && remaining > 0) {
        this.lastHalfSecondTick = halfSecBucket;
        this.playTickTone(remaining <= 1.5 ? 920 : 660);
      }

      if (remaining <= 0) {
        this.handleTimeOutOrFail();
      }
    }, 40);
  }

  incrementNamedWord(): void {
    if (this.roundCompleted()) return;
    const next = Math.min(3, this.namedCount() + 1);
    this.namedCount.set(next);
    this.playTickTone(520 + next * 160);

    if (next >= 3) {
      this.completeRoundSuccess();
    }
  }

  toggleItemSlot(slot: number): void {
    if (this.roundCompleted()) return;
    if (this.namedCount() >= slot) {
      this.namedCount.set(slot - 1);
    } else {
      this.namedCount.set(slot);
      this.playTickTone(520 + slot * 160);
      if (slot >= 3) {
        this.completeRoundSuccess();
      }
    }
  }

  logWordAndCount(): void {
    const word = this.spokenWordInput.trim();
    if (!word) return;
    const active = this.activePlayer();
    this.forbiddenWords.update((list) => [
      ...list,
      { player: active.name, playerColor: active.color, word },
    ]);
    this.spokenWordInput = '';
    if (!this.roundCompleted()) {
      this.incrementNamedWord();
    }
  }

  // Player succeeded in naming 3 items!
  completeRoundSuccess(): void {
    this.clearTimer();
    this.timerRunning.set(false);
    this.roundCompleted.set(true);
    this.namedCount.set(3);
    this.playWinChime();

    const winner = this.activePlayer();
    this.players.update((list) =>
      list.map((p) => (p.id === winner.id ? { ...p, score: p.score + 1 } : p)),
    );

    this.statusMessage.set(
      this.isEn()
        ? `🎉 Bravo! ${winner.name} named 3 items in time and advances +1 field!`
        : `🎉 Stark! ${winner.name} hat 3 Begriffe rechtzeitig genannt und rückt +1 Feld vor!`,
    );
  }

  // 5 seconds ran out — pass the question clockwise or award starter if everyone failed!
  handleTimeOutOrFail(): void {
    this.clearTimer();
    this.timerRunning.set(false);
    this.timeLeft.set(0.0);
    this.playZonkBuzzer();

    const currentP = this.activePlayer();
    const updatedFailed = this.failedPlayersInRound().includes(currentP.id)
      ? this.failedPlayersInRound()
      : [...this.failedPlayersInRound(), currentP.id];

    this.failedPlayersInRound.set(updatedFailed);

    const allPlayers = this.players();
    // Check if EVERY player in the circle has failed this question
    if (updatedFailed.length >= allPlayers.length) {
      const starter = allPlayers[this.roundStarterIndex()] ?? allPlayers[0];
      this.roundCompleted.set(true);
      this.players.update((list) =>
        list.map((p) => (p.id === starter.id ? { ...p, score: p.score + 1 } : p)),
      );
      this.statusMessage.set(
        this.isEn()
          ? `⏰ Nobody in the circle managed 3 items! Original starter ${starter.name} automatically scores +1 point!`
          : `⏰ Niemand in der gesamten Runde hat 3 Begriffe geschafft! Startspieler ${starter.name} erhält automatisch +1 Punkt!`,
      );
      return;
    }

    // Otherwise pass the exact same question clockwise to the next player
    const nextIdx = (this.activeTurnIndex() + 1) % allPlayers.length;
    this.activeTurnIndex.set(nextIdx);
    this.namedCount.set(0);
    this.timeLeft.set(5.0);
    this.specialCardUsedThisTurn.set(false);

    const nextPlayer = allPlayers[nextIdx];
    this.statusMessage.set(
      this.isEn()
        ? `🚨 ZONK! Time up for ${currentP.name}! Question passes clockwise to ${nextPlayer.name} (previous words are TABOO!).`
        : `🚨 ZONK! Zeit abgelaufen für ${currentP.name}! Gleiche Frage wandert weiter an ${nextPlayer.name} (vorherige Wörter sind TABU!).`,
    );
  }

  // SPECIAL CARD 1: "WEITERGEBEN" (Pass turn to clockwise neighbor)
  playPassCard(): void {
    if (this.timerRunning() || this.roundCompleted() || this.specialCardUsedThisTurn()) return;
    const active = this.activePlayer();
    if (active.passCardsLeft <= 0) return;

    this.players.update((list) =>
      list.map((p) =>
        p.id === active.id ? { ...p, passCardsLeft: p.passCardsLeft - 1 } : p,
      ),
    );

    const all = this.players();
    const nextIdx = (this.activeTurnIndex() + 1) % all.length;
    this.activeTurnIndex.set(nextIdx);
    this.specialCardUsedThisTurn.set(true);
    this.playTickTone(740);

    const nextP = all[nextIdx];
    this.statusMessage.set(
      this.isEn()
        ? `⏭️ ${active.name} played a PASS card! ${nextP.name} must now answer this question!`
        : `⏭️ ${active.name} spielt eine „Weitergeben“-Karte! ${nextP.name} muss die Frage nun beantworten!`,
    );
  }

  // SPECIAL CARD 2: "WECHSELN" (Switch question card)
  playSwitchCard(): void {
    if (this.timerRunning() || this.roundCompleted() || this.specialCardUsedThisTurn()) return;
    const active = this.activePlayer();
    if (active.switchCardsLeft <= 0) return;

    this.players.update((list) =>
      list.map((p) =>
        p.id === active.id ? { ...p, switchCardsLeft: p.switchCardsLeft - 1 } : p,
      ),
    );

    this.customQuestion = '';
    this.deckIndex.update((i) => i + 1);
    this.forbiddenWords.set([]);
    this.specialCardUsedThisTurn.set(true);
    this.playTickTone(840);

    this.statusMessage.set(
      this.isEn()
        ? `🔄 ${active.name} played a SWITCH card! A brand-new question was drawn!`
        : `🔄 ${active.name} spielt eine „Wechseln“-Karte! Eine komplett neue Frage wurde gezogen!`,
    );
  }

  startNextRound(): void {
    this.clearTimer();
    const total = this.players().length;
    const nextStarter = (this.roundStarterIndex() + 1) % total;
    this.roundStarterIndex.set(nextStarter);
    this.activeTurnIndex.set(nextStarter);
    this.drawNextCard(false);
  }

  drawNextCard(manual: boolean): void {
    this.clearTimer();
    this.timerRunning.set(false);
    this.roundCompleted.set(false);
    this.timeLeft.set(5.0);
    this.namedCount.set(0);
    this.failedPlayersInRound.set([]);
    this.forbiddenWords.set([]);
    this.specialCardUsedThisTurn.set(false);
    this.customQuestion = '';
    this.deckIndex.update((i) => i + 1);

    if (manual) {
      this.roundStarterIndex.set(this.activeTurnIndex());
    }

    const active = this.activePlayer();
    this.statusMessage.set(
      this.isEn()
        ? `New card drawn for ${active.name}! Flip the 5-Second Spiral Timer when ready.`
        : `Neue Fragekarte für ${active.name}! Drehe die 5-Sekunden-Rutsche um, sobald vorgelesen wurde.`,
    );
  }

  selectPlayerManually(index: number): void {
    if (this.timerRunning()) return;
    this.activeTurnIndex.set(index);
    this.roundStarterIndex.set(index);
  }

  addPlayer(): void {
    const list = this.players();
    if (list.length >= 8) return;
    const trimmed = this.newPlayerName.trim();
    const nextNum = list.length + 1;
    const name = trimmed || (this.isEn() ? `Player ${nextNum}` : `Spieler ${nextNum}`);
    const color = PLAYER_COLORS[(nextNum - 1) % PLAYER_COLORS.length];

    this.players.set([
      ...list,
      { id: Date.now(), name, color, score: 0, passCardsLeft: 2, switchCardsLeft: 2 },
    ]);
    this.newPlayerName = '';
    savePlayerNames(this.players().map((p) => p.name));
  }

  removePlayer(id: number): void {
    const list = this.players();
    if (list.length <= 2) return;
    const filtered = list.filter((p) => p.id !== id);
    this.players.set(filtered);
    savePlayerNames(filtered.map((p) => p.name));
    if (this.activeTurnIndex() >= filtered.length) {
      this.activeTurnIndex.set(0);
      this.roundStarterIndex.set(0);
    }
  }

  updatePlayerName(id: number, name: string): void {
    this.players.update((list) =>
      list.map((p) => (p.id === id ? { ...p, name } : p)),
    );
    savePlayerNames(this.players().map((p) => p.name));
  }

  resetMatch(): void {
    this.clearTimer();
    this.timerRunning.set(false);
    this.roundCompleted.set(false);
    this.timeLeft.set(5.0);
    this.namedCount.set(0);
    this.activeTurnIndex.set(0);
    this.roundStarterIndex.set(0);
    this.failedPlayersInRound.set([]);
    this.forbiddenWords.set([]);
    this.specialCardUsedThisTurn.set(false);
    this.players.update((list) =>
      list.map((p) => ({ ...p, score: 0, passCardsLeft: 2, switchCardsLeft: 2 })),
    );
    this.deckIndex.update((i) => i + 1);
  }

  // ============================================================
  // WEB AUDIO API SOUND EFFECTS (SPIRAL SLIDE, TICKS, ZONK, WIN)
  // ============================================================
  private getAudioContext(): AudioContext | null {
    if (!this.audioOn()) return null;
    if (!this.audioCtx && typeof window !== 'undefined') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.audioCtx = new AudioCtx();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  private playSpiralSlideSound(): void {
    const ctx = this.getAudioContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(780, now);
      osc.frequency.exponentialRampToValueAtTime(340, now + 0.35);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.36);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.36);
    } catch {
      // Ignore audio errors
    }
  }

  private playTickTone(freq: number): void {
    const ctx = this.getAudioContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.11, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.075);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.08);
    } catch {
      // Ignore audio errors
    }
  }

  private playZonkBuzzer(): void {
    const ctx = this.getAudioContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(155, now);
      osc.frequency.linearRampToValueAtTime(110, now + 0.45);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.48);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.48);
    } catch {
      // Ignore audio errors
    }
  }

  private playWinChime(): void {
    const ctx = this.getAudioContext();
    if (!ctx) return;
    try {
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, idx) => {
        const now = ctx.currentTime + idx * 0.08;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0.14, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.25);
      });
    } catch {
      // Ignore audio errors
    }
  }

  private clearTimer(): void {
    if (this.timerIntervalId !== null) {
      clearInterval(this.timerIntervalId);
      this.timerIntervalId = null;
    }
  }

  ngOnDestroy(): void {
    this.clearTimer();
  }
}
