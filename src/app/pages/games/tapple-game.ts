import { Component, HostListener, OnDestroy, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { loadSavedPlayerNames, savePlayerNames } from '../../services/player-storage';
import { LanguageService } from '../../services/language.service';

export type TappleLang = 'de' | 'en';

export interface TapplePlayer {
  id: number;
  name: string;
  color: string;
  cardsWon: string[];
  eliminatedInRound: boolean;
}

export interface TappleCard {
  id: number;
  easyCategory: { de: string; en: string };
  hardCategory: { de: string; en: string };
  isPersonCategory?: boolean;
}

export interface WordLogEntry {
  player: string;
  playerColor: string;
  letter: string;
  word?: string;
}

/**
 * Alle 26 Buchstaben des Alphabets (A bis Z)
 */
export const TAPPLE_LETTERS: string[] = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
  'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
];

export const TAPPLE_CARDS_DECK: TappleCard[] = [
  { id: 1, easyCategory: { de: 'Dinge im Kühlschrank', en: 'Things in a Fridge' }, hardCategory: { de: 'Film-Bösewichte', en: 'Movie Villains' }, isPersonCategory: true },
  { id: 2, easyCategory: { de: 'Tiere im Zoo', en: 'Zoo Animals' }, hardCategory: { de: 'Historische Persönlichkeiten', en: 'Historical Figures' }, isPersonCategory: true },
  { id: 3, easyCategory: { de: 'Pizzabeläge', en: 'Pizza Toppings' }, hardCategory: { de: 'Hauptstädte der Welt', en: 'World Capitals' } },
  { id: 4, easyCategory: { de: 'Automarken', en: 'Car Brands' }, hardCategory: { de: 'Dinge, die man im Flugzeug nicht sagen sollte', en: 'Things Not to Say on an Airplane' } },
  { id: 5, easyCategory: { de: 'Länder in Europa', en: 'European Countries' }, hardCategory: { de: 'Schauspieler & Filmstars', en: 'Actors & Movie Stars' }, isPersonCategory: true },
  { id: 6, easyCategory: { de: 'Obst & Gemüse', en: 'Fruits & Vegetables' }, hardCategory: { de: 'Erfindungen der Menschheit', en: 'Famous Inventions' } },
  { id: 7, easyCategory: { de: 'Sportarten', en: 'Sports' }, hardCategory: { de: 'Videospiel-Charaktere', en: 'Video Game Characters' }, isPersonCategory: true },
  { id: 8, easyCategory: { de: 'Dinge am Strand', en: 'Things at the Beach' }, hardCategory: { de: 'Musiker & Bands', en: 'Musicians & Bands' }, isPersonCategory: true },
  { id: 9, easyCategory: { de: 'Berufe', en: 'Jobs & Occupations' }, hardCategory: { de: 'Ausreden fürs Zuspätkommen', en: 'Excuses for Being Late' } },
  { id: 10, easyCategory: { de: 'Eissorten & Desserts', en: 'Ice Cream Flavors & Desserts' }, hardCategory: { de: 'Chemische Elemente & Metalle', en: 'Chemical Elements & Metals' } },
  { id: 11, easyCategory: { de: 'Kleidungsstücke', en: 'Items of Clothing' }, hardCategory: { de: 'Berühmte Sportler', en: 'Famous Athletes' }, isPersonCategory: true },
  { id: 12, easyCategory: { de: 'Dinge im Badezimmer', en: 'Things in a Bathroom' }, hardCategory: { de: 'Kino-Blockbuster & Filme', en: 'Blockbuster Movies' } },
  { id: 13, easyCategory: { de: 'Superhelden', en: 'Superheroes' }, hardCategory: { de: 'Dinge, die mehr als 1.000 € kosten', en: 'Things That Cost Over $1,000' }, isPersonCategory: true },
  { id: 14, easyCategory: { de: 'Getränke', en: 'Beverages & Drinks' }, hardCategory: { de: 'Buchtitel & Romane', en: 'Book Titles & Novels' } },
  { id: 15, easyCategory: { de: 'Dinge, die rund sind', en: 'Things That Are Round' }, hardCategory: { de: 'Wissenschaftler & Entdecker', en: 'Scientists & Explorers' }, isPersonCategory: true },
  { id: 16, easyCategory: { de: 'Möbelstücke', en: 'Furniture & Home Items' }, hardCategory: { de: 'Serien auf Netflix & Co.', en: 'TV Shows & Streaming Series' } },
  { id: 17, easyCategory: { de: 'Schulfächer & Hobbys', en: 'School Subjects & Hobbies' }, hardCategory: { de: 'Millionenstädte weltweit', en: 'Major World Cities' } },
  { id: 18, easyCategory: { de: 'Dinge beim Camping', en: 'Camping Gear' }, hardCategory: { de: 'Märchen- & Sagenfiguren', en: 'Fairy Tale & Mythical Characters' }, isPersonCategory: true },
  { id: 19, easyCategory: { de: 'Süßigkeiten & Snacks', en: 'Candies & Snacks' }, hardCategory: { de: 'Flüsse & Seen der Welt', en: 'Rivers & Lakes of the World' } },
  { id: 20, easyCategory: { de: 'Küchengeräte & Utensilien', en: 'Kitchen Appliances & Tools' }, hardCategory: { de: 'Sängerinnen & Popstars', en: 'Pop Singers & Divas' }, isPersonCategory: true },
  { id: 21, easyCategory: { de: 'Hunderassen & Haustiere', en: 'Dog Breeds & Pets' }, hardCategory: { de: 'Länder in Asien & Afrika', en: 'Asian & African Countries' } },
  { id: 22, easyCategory: { de: 'Dinge im Rucksack oder in der Handtasche', en: 'Things in a Backpack or Purse' }, hardCategory: { de: 'Komiker & Comedians', en: 'Comedians & Entertainers' }, isPersonCategory: true },
  { id: 23, easyCategory: { de: 'Werkzeuge im Baumarkt', en: 'Hardware Store Tools' }, hardCategory: { de: 'Götter der Mythologie', en: 'Mythological Gods & Deities' }, isPersonCategory: true },
  { id: 24, easyCategory: { de: 'Musikinstrumente', en: 'Musical Instruments' }, hardCategory: { de: 'Krankheiten & medizinische Begriffe', en: 'Medical Terms & Ailments' } },
  { id: 25, easyCategory: { de: 'Dinge im Supermarkt', en: 'Supermarket Items' }, hardCategory: { de: 'Regisseure & Filmemacher', en: 'Movie Directors' }, isPersonCategory: true },
  { id: 26, easyCategory: { de: 'Farben & Farbtöne', en: 'Colors & Shades' }, hardCategory: { de: 'Inseln & Urlaubsparadiese', en: 'Islands & Vacation Paradises' } },
  { id: 27, easyCategory: { de: 'Vornamen für Jungen', en: 'Boys First Names' }, hardCategory: { de: 'Maler & Bildhauer', en: 'Famous Painters & Artists' }, isPersonCategory: true },
  { id: 28, easyCategory: { de: 'Vornamen für Mädchen', en: 'Girls First Names' }, hardCategory: { de: 'Schriftsteller & Autoren', en: 'Authors & Writers' }, isPersonCategory: true },
  { id: 29, easyCategory: { de: 'Dinge im Schlafzimmer', en: 'Things in a Bedroom' }, hardCategory: { de: 'Videospiele & Konsolen-Hits', en: 'Video Game Titles' } },
  { id: 30, easyCategory: { de: 'Fast-Food-Gerichte & Ketten', en: 'Fast Food Dishes & Chains' }, hardCategory: { de: 'Politiker & Staatsoberhäupter', en: 'Politicians & World Leaders' }, isPersonCategory: true },
  { id: 31, easyCategory: { de: 'Dinge, die fliegen können', en: 'Things That Can Fly' }, hardCategory: { de: 'Sehenswürdigkeiten & Wahrzeichen', en: 'World Landmarks & Monuments' } },
  { id: 32, easyCategory: { de: 'Blumen, Bäume & Pflanzen', en: 'Flowers, Trees & Plants' }, hardCategory: { de: 'Songtitel aus den 80ern, 90ern & 2000ern', en: 'Hit Songs from the 80s, 90s & 2000s' } },
  { id: 33, easyCategory: { de: 'Meerestiere & Fische', en: 'Sea Creatures & Fish' }, hardCategory: { de: 'Milliardäre & Unternehmer', en: 'Billionaires & Tech Founders' }, isPersonCategory: true },
  { id: 34, easyCategory: { de: 'Vögel & Insekten', en: 'Birds & Insects' }, hardCategory: { de: 'Gebirge, Berge & Vulkane', en: 'Mountains & Volcanoes' } },
  { id: 35, easyCategory: { de: 'Dinge auf dem Schreibtisch', en: 'Things on an Office Desk' }, hardCategory: { de: 'Apps auf dem Smartphone', en: 'Smartphone Apps' } },
  { id: 36, easyCategory: { de: 'Frühstücks-Zutaten', en: 'Breakfast Foods' }, hardCategory: { de: 'Disney- & Pixar-Figuren', en: 'Disney & Pixar Characters' }, isPersonCategory: true },
  { id: 37, easyCategory: { de: 'Gewürze & Kräuter', en: 'Spices & Herbs' }, hardCategory: { de: 'Astronomie & Weltraum-Begriffe', en: 'Astronomy & Space Terms' } },
  { id: 38, easyCategory: { de: 'Backwaren, Kuchen & Brot', en: 'Pastries, Cakes & Bread' }, hardCategory: { de: 'Detektive & Krimi-Figuren', en: 'Fictional Detectives' }, isPersonCategory: true },
  { id: 39, easyCategory: { de: 'Käsesorten & Milchprodukte', en: 'Cheeses & Dairy Products' }, hardCategory: { de: 'Modemarken & Luxus-Labels', en: 'Luxury & Fashion Brands' } },
  { id: 40, easyCategory: { de: 'Dinge im Garten', en: 'Things in a Garden' }, hardCategory: { de: 'Brettspiele & Kartenspiele', en: 'Board & Card Games' } },
  { id: 41, easyCategory: { de: 'Fahrzeuge & Transportmittel', en: 'Vehicles & Modes of Transport' }, hardCategory: { de: 'Anime- & Manga-Charaktere', en: 'Anime & Manga Characters' }, isPersonCategory: true },
  { id: 42, easyCategory: { de: 'Körperteile & Organe', en: 'Body Parts & Organs' }, hardCategory: { de: 'Fußballvereine weltweit', en: 'Football / Soccer Clubs' } },
  { id: 43, easyCategory: { de: 'Dinge, die kalt sind', en: 'Things That Are Cold' }, hardCategory: { de: 'Rapper & Hip-Hop-Künstler', en: 'Rappers & Hip-Hop Artists' }, isPersonCategory: true },
  { id: 44, easyCategory: { de: 'Dinge, die heiß sind', en: 'Things That Are Hot' }, hardCategory: { de: 'Rockbands & Metalbands', en: 'Rock & Metal Bands' } },
  { id: 45, easyCategory: { de: 'Dinge, die grün sind', en: 'Things That Are Green' }, hardCategory: { de: 'Horrorfilme & Gruselklassiker', en: 'Horror Movies' } },
  { id: 46, easyCategory: { de: 'Dinge, die rot sind', en: 'Things That Are Red' }, hardCategory: { de: 'US-Bundesstaaten & Städte', en: 'US States & Cities' } },
  { id: 47, easyCategory: { de: 'Dinge auf einer Party', en: 'Things at a Party' }, hardCategory: { de: 'Cocktails & Longdrinks', en: 'Cocktails & Mixed Drinks' } },
  { id: 48, easyCategory: { de: 'Weihnachts-Begriffe', en: 'Christmas Things' }, hardCategory: { de: 'Youtuber, Streamer & Influencer', en: 'YouTubers, Streamers & Influencers' }, isPersonCategory: true },
  { id: 49, easyCategory: { de: 'Dinge im Krankenhaus', en: 'Things in a Hospital' }, hardCategory: { de: 'Harry-Potter-Charaktere & Begriffe', en: 'Harry Potter Characters & Spells' }, isPersonCategory: true },
  { id: 50, easyCategory: { de: 'Dinge in der Schule', en: 'Things in a Classroom' }, hardCategory: { de: 'Star-Wars-Charaktere & Planeten', en: 'Star Wars Characters & Planets' }, isPersonCategory: true },
  { id: 51, easyCategory: { de: 'Spielzeug für Kinder', en: 'Children Toys' }, hardCategory: { de: 'Marvel- & DC-Charaktere', en: 'Marvel & DC Characters' }, isPersonCategory: true },
  { id: 52, easyCategory: { de: 'Dinge im Hotelzimmer', en: 'Things in a Hotel Room' }, hardCategory: { de: 'Dinge, die man vor dem ersten Date tut', en: 'Things You Do Before a First Date' } },
  { id: 53, easyCategory: { de: 'Wetter- & Naturphänomene', en: 'Weather & Natural Phenomena' }, hardCategory: { de: 'Dinge, die im Dunkeln leuchten', en: 'Things That Glow in the Dark' } },
  { id: 54, easyCategory: { de: 'Dinge aus Holz', en: 'Things Made of Wood' }, hardCategory: { de: 'Sprichwörter & Redewendungen', en: 'Idioms & Proverbs' } },
  { id: 55, easyCategory: { de: 'Dinge aus Metall', en: 'Things Made of Metal' }, hardCategory: { de: 'Böse Gewohnheiten & Laster', en: 'Bad Habits & Vices' } },
  { id: 56, easyCategory: { de: 'Dinge aus Plastik', en: 'Things Made of Plastic' }, hardCategory: { de: 'Gründe für eine Trennung', en: 'Reasons to Break Up' } },
  { id: 57, easyCategory: { de: 'Dinge aus Glas', en: 'Things Made of Glass' }, hardCategory: { de: 'Dinge, die man auf eine einsame Insel mitnimmt', en: 'Things to Bring to a Deserted Island' } },
  { id: 58, easyCategory: { de: 'Suppen, Saucen & Dips', en: 'Soups, Sauces & Dips' }, hardCategory: { de: 'Italienische Speisen & Begriffe', en: 'Italian Dishes & Words' } },
  { id: 59, easyCategory: { de: 'Nudelsorten & Reisgerichte', en: 'Pasta Types & Rice Dishes' }, hardCategory: { de: 'Asiatische Gerichte & Zutaten', en: 'Asian Dishes & Ingredients' } },
  { id: 60, easyCategory: { de: 'Fleisch-, Wurst- & Grillgerichte', en: 'BBQ & Meat Dishes' }, hardCategory: { de: 'Vegane & vegetarische Alternativen', en: 'Vegan & Vegetarian Foods' } },
  { id: 61, easyCategory: { de: 'Dinge im Freizeitpark / Jahrmarkt', en: 'Amusement Park Attractions' }, hardCategory: { de: 'Phobien & Ängste', en: 'Phobias & Fears' } },
  { id: 62, easyCategory: { de: 'Dinge im Kino', en: 'Things in a Movie Theater' }, hardCategory: { de: 'Oscar-prämierte Filme & Schauspieler', en: 'Oscar-Winning Movies & Actors' }, isPersonCategory: true },
  { id: 63, easyCategory: { de: 'Dinge im Fitnessstudio', en: 'Things in a Gym' }, hardCategory: { de: 'Olympische Disziplinen', en: 'Olympic Events' } },
  { id: 64, easyCategory: { de: 'Wintersport & Schnee-Begriffe', en: 'Winter Sports & Snow Gear' }, hardCategory: { de: 'Extremsportarten & Abenteuer', en: 'Extreme Sports' } },
  { id: 65, easyCategory: { de: 'Wassersport & Schwimmbad', en: 'Water Sports & Pool Items' }, hardCategory: { de: 'Berühmte Fußballspieler', en: 'Famous Football / Soccer Players' }, isPersonCategory: true },
  { id: 66, easyCategory: { de: 'Dinge auf dem Bauernhof', en: 'Things on a Farm' }, hardCategory: { de: 'Ausgestorbene Tiere & Dinosaurier', en: 'Extinct Animals & Dinosaurs' } },
  { id: 67, easyCategory: { de: 'Tiere im Wald', en: 'Forest Animals' }, hardCategory: { de: 'Giftige Tiere & Pflanzen', en: 'Venomous or Poisonous Creatures' } },
  { id: 68, easyCategory: { de: 'Tiere in Afrika / auf Safari', en: 'Safari Animals' }, hardCategory: { de: 'Fabelwesen & Monster', en: 'Mythical Creatures & Monsters' } },
  { id: 69, easyCategory: { de: 'Dinge im Auto / Handschuhfach', en: 'Things Inside a Car' }, hardCategory: { de: 'Fluggesellschaften & Flughäfen', en: 'Airlines & Airports' } },
  { id: 70, easyCategory: { de: 'Dinge am Bahnhof oder im Zug', en: 'Things at a Train Station' }, hardCategory: { de: 'Länder in Nord- & Südamerika', en: 'Countries in the Americas' } },
  { id: 71, easyCategory: { de: 'Städte in Deutschland, Österreich & der Schweiz', en: 'Cities in Germany, Austria & Switzerland' }, hardCategory: { de: 'Sprachen & Dialekte der Welt', en: 'World Languages & Dialects' } },
  { id: 72, easyCategory: { de: 'Urlaubsländer am Mittelmeer', en: 'Mediterranean Vacation Spots' }, hardCategory: { de: 'Währungen & Zahlungsmittel', en: 'World Currencies & Payment Methods' } },
  { id: 73, easyCategory: { de: 'Dinge, die man am Wochenende macht', en: 'Weekend Activities' }, hardCategory: { de: 'Festival-Bands & DJs', en: 'Festival Headliners & DJs' }, isPersonCategory: true },
  { id: 74, easyCategory: { de: 'Dinge, die Strom brauchen', en: 'Things That Run on Electricity' }, hardCategory: { de: 'Tech-Konzerne & Elektronikmarken', en: 'Tech Giants & Electronics Brands' } },
  { id: 75, easyCategory: { de: 'Computer- & Gaming-Zubehör', en: 'Computer & Gaming Gear' }, hardCategory: { de: 'Programmiersprachen & IT-Begriffe', en: 'Programming Languages & Tech Terms' } },
  { id: 76, easyCategory: { de: 'Dinge im Wohnzimmer', en: 'Things in a Living Room' }, hardCategory: { de: 'Podcast-Themen & TV-Shows', en: 'Podcast Topics & TV Game Shows' } },
  { id: 77, easyCategory: { de: 'Dinge im Keller oder auf dem Dachboden', en: 'Things in a Basement or Attic' }, hardCategory: { de: 'Dinge, die man immer verliert', en: 'Things People Always Lose' } },
  { id: 78, easyCategory: { de: 'Schmuck & Accessoires', en: 'Jewelry & Fashion Accessories' }, hardCategory: { de: 'Edelsteine & Mineralien', en: 'Gemstones & Minerals' } },
  { id: 79, easyCategory: { de: 'Schuhe & Kopfbedeckungen', en: 'Shoes & Headwear' }, hardCategory: { de: 'Kosmetik- & Pflege-Marken', en: 'Cosmetics & Skincare Brands' } },
  { id: 80, easyCategory: { de: 'Dinge beim Friseur', en: 'Things at a Hair Salon' }, hardCategory: { de: 'Modetrends & Kleidungsstile', en: 'Fashion Trends & Styles' } },
  { id: 81, easyCategory: { de: 'Dinge in einer Bar oder Kneipe', en: 'Things in a Bar or Pub' }, hardCategory: { de: 'Biere, Weine & Spirituosen', en: 'Beers, Wines & Spirits' } },
  { id: 82, easyCategory: { de: 'Dinge im Restaurant', en: 'Things in a Restaurant' }, hardCategory: { de: 'Sterneköche & TV-Köche', en: 'Celebrity Chefs' }, isPersonCategory: true },
  { id: 83, easyCategory: { de: 'Dinge beim Kindergeburtstag', en: 'Kids Birthday Party Items' }, hardCategory: { de: 'Zeichentrickserien der Kindheit', en: 'Childhood Cartoons' } },
  { id: 84, easyCategory: { de: 'Dinge auf einer Hochzeit', en: 'Things at a Wedding' }, hardCategory: { de: 'Romantische Filme & Liebeslieder', en: 'Romantic Movies & Love Songs' } },
  { id: 85, easyCategory: { de: 'Halloween-Kostüme & Grusel-Deko', en: 'Halloween Costumes & Decor' }, hardCategory: { de: 'Übernatürliche Phänomene & Mythen', en: 'Supernatural & Urban Legends' } },
  { id: 86, easyCategory: { de: 'Dinge bei der Polizei oder Feuerwehr', en: 'Police & Firefighter Gear' }, hardCategory: { de: 'Verbrechen & Krimi-Begriffe', en: 'True Crime & Detective Terms' } },
  { id: 87, easyCategory: { de: 'Mittelalter, Ritter & Burgen', en: 'Medieval Knights & Castles' }, hardCategory: { de: 'Könige, Kaiser & Pharaonen', en: 'Kings, Queens & Emperors' }, isPersonCategory: true },
  { id: 88, easyCategory: { de: 'Piraten & Seefahrt', en: 'Pirates & Sailing' }, hardCategory: { de: 'Entdecker & Seefahrer', en: 'Explorers & Navigators' }, isPersonCategory: true },
  { id: 89, easyCategory: { de: 'Wilder Westen & Cowboys', en: 'Wild West & Cowboys' }, hardCategory: { de: 'Herr-der-Ringe- & Fantasy-Begriffe', en: 'Lord of the Rings & Fantasy Lore' }, isPersonCategory: true },
  { id: 90, easyCategory: { de: 'Dinge im Zirkus', en: 'Things at a Circus' }, hardCategory: { de: 'Musical-Titel & Theaterstücke', en: 'Musicals & Stage Plays' } },
  { id: 91, easyCategory: { de: 'Dinge im Museum', en: 'Things in a Museum' }, hardCategory: { de: 'Klassische Komponisten', en: 'Classical Composers' }, isPersonCategory: true },
  { id: 92, easyCategory: { de: 'Gefühle & Charaktereigenschaften', en: 'Emotions & Personality Traits' }, hardCategory: { de: 'Psychologische Begriffe & Ticks', en: 'Psychology Terms & Quirks' } },
  { id: 93, easyCategory: { de: 'Dinge, die gut riechen', en: 'Things That Smell Good' }, hardCategory: { de: 'Dinge, die furchtbar stinken', en: 'Things That Smell Terrible' } },
  { id: 94, easyCategory: { de: 'Dinge, die laut sind', en: 'Things That Are Loud' }, hardCategory: { de: 'Geräusche, die extrem nerven', en: 'Annoying Sounds' } },
  { id: 95, easyCategory: { de: 'Dinge, die weich oder flauschig sind', en: 'Things That Are Soft or Fluffy' }, hardCategory: { de: 'Dinge, die spitz oder scharf sind', en: 'Things That Are Sharp or Pointy' } },
  { id: 96, easyCategory: { de: 'Dinge, die klebrig sind', en: 'Things That Are Sticky' }, hardCategory: { de: 'Dinge, die leicht zerbrechen', en: 'Things That Break Easily' } },
  { id: 97, easyCategory: { de: 'Dinge mit Rädern', en: 'Things With Wheels' }, hardCategory: { de: 'Dinge mit Tasten oder Knöpfen', en: 'Things With Buttons or Keys' } },
  { id: 98, easyCategory: { de: 'Dinge, die man im Winter braucht', en: 'Things You Need in Winter' }, hardCategory: { de: 'Neujahrsvorsätze, die man nie einhält', en: 'New Year Resolutions People Break' } },
  { id: 99, easyCategory: { de: 'Dinge im Geldbeutel / Portemonnaie', en: 'Things in a Wallet' }, hardCategory: { de: 'Dinge, für die man zu viel Geld ausgibt', en: 'Things People Spend Too Much Money On' } },
  { id: 100, easyCategory: { de: 'Geschenke zum Geburtstag', en: 'Birthday Gifts' }, hardCategory: { de: 'Schreckliche Geschenke, die niemand will', en: 'Terrible Gifts Nobody Wants' } },
];

const PLAYER_COLORS = [
  '#f43f5e', '#06b6d4', '#10b981', '#f59e0b',
  '#8b5cf6', '#ec4899', '#3b82f6', '#84cc16',
];

@Component({
  selector: 'app-tapple-game',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="tapple-page">
      <!-- TOP NAVIGATION -->
      <div class="topbar">
        <a routerLink="/" class="back-btn">
          ← {{ isEn() ? 'Back to Hub' : 'Zurück zur Übersicht' }}
        </a>

        <div class="top-controls">
          <!-- QUICK LANGUAGE SWITCHER -->
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

          <button
            type="button"
            class="switch-pill"
            [class.on]="powerOn()"
            (click)="togglePower()"
            title="Tapple-Wheel ON/OFF"
          >
            <span class="led"></span>
            <span>
              {{
                powerOn()
                  ? isEn()
                    ? 'SWITCH: ON (Audio)'
                    : 'SCHALTER: ON (Audio)'
                  : isEn()
                    ? 'SWITCH: OFF (Mute)'
                    : 'SCHALTER: OFF (Stumm)'
              }}
            </span>
          </button>

          <button type="button" class="btn-secondary sm" (click)="showRulesModal.set(!showRulesModal())">
            📖 {{ isEn() ? (showRulesModal() ? 'Hide Rules' : 'Game Rules') : (showRulesModal() ? 'Regeln ausblenden' : 'Spielregeln') }}
          </button>

          <button type="button" class="btn-secondary sm" (click)="showSetupModal.set(!showSetupModal())">
            ⚙️ {{ isEn() ? 'Settings & Players' : 'Einstellungen & Spieler' }} ({{ players().length }})
          </button>
        </div>
      </div>

      <!-- COLLAPSIBLE RULES PANEL -->
      @if (showRulesModal()) {
        <section class="rules-panel glass-panel">
          <div class="rules-head">
            <div>
              <h3>
                📖 {{ isEn() ? 'Official Tapple Rules & Details' : 'Offizielle Tapple-Spielanleitung & Detailregeln' }}
              </h3>
              <p>
                {{
                  isEn()
                    ? 'Fast-paced word game for 2 to 8 players with 26 letter keys (A–Z) & 10-second timer'
                    : 'Schnelles Wortfindungsspiel für 2 bis 8 Spieler mit allen 26 Buchstabentasten (A–Z) & 10-Sekunden-Timer'
                }}
              </p>
            </div>
            <button type="button" class="btn-secondary sm" (click)="showRulesModal.set(false)">
              ✕ {{ isEn() ? 'Close' : 'Schließen' }}
            </button>
          </div>

          <div class="rules-grid">
            <div class="rule-card">
              <h4>1️⃣ {{ isEn() ? 'Setup & The Wheel' : 'Vorbereitung & Rad' }}</h4>
              <p>
                @if (isEn()) {
                  The Tapple wheel features all <strong>26 letter keys (A–Z)</strong>. Make sure all 26 keys are up before starting a round.
                } @else {
                  Das Tapple-Rad besitzt alle <strong>26 Buchstabentasten (A–Z)</strong>.
                  Vor jeder Runde stehen alle 26 Tasten oben.
                }
              </p>
            </div>

            <div class="rule-card">
              <h4>2️⃣ {{ isEn() ? 'Gameplay (10 Seconds)' : 'Ablauf (10 Sekunden)' }}</h4>
              <p>
                @if (isEn()) {
                  Draw a category card → Press the big red center button (10s timer starts) → Shout a matching word,
                  press its first letter key down, and <strong>immediately hit the red center button again</strong>!
                  The timer resets to 10s for the next player clockwise.
                } @else {
                  Kategorie ziehen → Roten Knopf in der Mitte drücken (10s Timer startet) → Passenden Begriff rufen,
                  Anfangsbuchstaben herunterdrücken und <strong>sofort wieder auf den roten Knopf schlagen</strong>!
                  Der Timer springt zurück auf 10s und der nächste Spieler im Uhrzeigersinn ist dran.
                }
              </p>
            </div>

            <div class="rule-card">
              <h4>3️⃣ {{ isEn() ? 'Articles & Names' : 'Artikel & Personennamen' }}</h4>
              <p>
                @if (isEn()) {
                  <strong>Ignore Articles:</strong> Words like "The", "A", or "An" do not count (for <em>"The Godfather"</em> use <strong>G</strong>).<br />
                  <strong>People's Names:</strong> Both first and last name initials are allowed (for <em>"Brad Pitt"</em> you can press <strong>B</strong> or <strong>P</strong>).
                } @else {
                  <strong>Artikel ignorieren:</strong> „Der“, „Die“, „Das“, „Ein“, „Eine“ zählen nicht (bei <em>„Der Pate“</em> zählt das <strong>P</strong>).<br />
                  <strong>Personennamen:</strong> Sowohl Vorname als auch Nachname sind erlaubt (bei <em>„Brad Pitt“</em> geht <strong>B</strong> oder <strong>P</strong>).
                }
              </p>
            </div>

            <div class="rule-card">
              <h4>4️⃣ {{ isEn() ? 'Elimination, Reset & Winning' : 'Ausscheiden, Reset & Sieg' }}</h4>
              <p>
                @if (isEn()) {
                  If the 10s buzzer sounds, you are out for the round while others continue with the remaining letters.
                  If <strong>all 26 letters are used</strong>, hit the reset lever mid-turn and keep going!
                  First player to collect <strong>{{ targetCardsToWin() }} cards</strong> wins!
                } @else {
                  Wer die 10s überschreitet, scheidet für die Runde aus; die anderen spielen mit denselben Buchstaben weiter.
                  Sind <strong>alle 26 Buchstaben verbraucht</strong>, setzt der Reset-Hebel alle Tasten mitten im Zug zurück!
                  Wer zuerst <strong>{{ targetCardsToWin() }} Karten</strong> sammelt, gewinnt!
                }
              </p>
            </div>
          </div>
        </section>
      }

      <!-- COLLAPSIBLE SETUP PANEL -->
      @if (showSetupModal()) {
        <section class="setup-panel glass-panel">
          <div class="rules-head">
            <div>
              <h3>
                ⚙️ {{ isEn() ? 'Game Settings, Language & Players (2–8)' : 'Spieleinstellungen, Sprache & Spieler (2–8)' }}
              </h3>
              <p>
                {{
                  isEn()
                    ? 'Configure language (German/English), player names, winning target, and overtime rules'
                    : 'Konfiguriere Sprache (Deutsch/Englisch), Spielernamen, Sieg-Kartenanzahl und Overtime-Regeln'
                }}
              </p>
            </div>
            <button type="button" class="btn-secondary sm" (click)="showSetupModal.set(false)">
              ✓ {{ isEn() ? 'Done' : 'Fertig' }}
            </button>
          </div>

          <div class="setup-columns">
            <div class="players-config">
              <label class="cfg-label">
                {{ isEn() ? 'Players Clockwise' : 'Spieler im Uhrzeigersinn' }} ({{ players().length }} / 8):
              </label>
              <div class="player-edit-list">
                @for (p of players(); track p.id; let idx = $index) {
                  <div class="player-edit-row">
                    <span class="p-dot" [style.background]="p.color">{{ idx + 1 }}</span>
                    <input
                      type="text"
                      [ngModel]="p.name"
                      (ngModelChange)="updatePlayerName(p.id, $event)"
                      class="p-name-input"
                    />
                    <span class="p-score-tag">🃏 {{ p.cardsWon.length }}</span>
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
                    [ngModel]="newPlayerName()"
                    (ngModelChange)="newPlayerName.set($event)"
                    (keydown.enter)="addPlayer()"
                    [placeholder]="isEn() ? 'New player name...' : 'Neuer Spielername...'"
                    class="p-name-input"
                  />
                  <button type="button" class="btn-secondary sm" (click)="addPlayer()">
                    + {{ isEn() ? 'Add Player' : 'Spieler hinzufügen' }}
                  </button>
                </div>
              }
            </div>

            <div class="rules-config">
              <label class="cfg-label">
                {{ isEn() ? 'Language & House Rules:' : 'Sprache & Spieleinstellungen:' }}
              </label>

              <!-- LANGUAGE SETTING -->
              <div class="opt-row">
                <span>{{ isEn() ? 'Game & Category Language (Sprache):' : 'Spiel- & Kategoriensprache (Language):' }}</span>
                <div class="pill-group">
                  <button
                    type="button"
                    class="opt-pill"
                    [class.active]="lang() === 'de'"
                    (click)="setLanguage('de')"
                  >
                    🇩🇪 Deutsch (German)
                  </button>
                  <button
                    type="button"
                    class="opt-pill"
                    [class.active]="lang() === 'en'"
                    (click)="setLanguage('en')"
                  >
                    🇬🇧 English (Englisch)
                  </button>
                </div>
              </div>

              <!-- WIN TARGET -->
              <div class="opt-row">
                <span>{{ isEn() ? 'Cards Needed to Win:' : 'Siegpunkt-Ziel (Karten zum Gesamtsieg):' }}</span>
                <div class="pill-group">
                  <button
                    type="button"
                    class="opt-pill"
                    [class.active]="targetCardsToWin() === 3"
                    (click)="targetCardsToWin.set(3)"
                  >
                    {{ isEn() ? '3 Cards (Quick Game)' : '3 Karten (Schnell)' }}
                  </button>
                  <button
                    type="button"
                    class="opt-pill"
                    [class.active]="targetCardsToWin() === 5"
                    (click)="targetCardsToWin.set(5)"
                  >
                    {{ isEn() ? '5 Cards (Standard)' : '5 Karten (Standard)' }}
                  </button>
                </div>
              </div>

              <!-- CONTROL FLOW -->
              <div class="opt-row">
                <span>{{ isEn() ? 'Turn Control Mode:' : 'Bedienung auf einem Gerät:' }}</span>
                <div class="pill-group">
                  <button
                    type="button"
                    class="opt-pill"
                    [class.active]="!instantPassMode()"
                    (click)="instantPassMode.set(false)"
                  >
                    {{ isEn() ? 'Authentic (1. Letter → 2. Red Button)' : 'Original (1. Buchstabe → 2. Roter Knopf)' }}
                  </button>
                  <button
                    type="button"
                    class="opt-pill"
                    [class.active]="instantPassMode()"
                    (click)="instantPassMode.set(true)"
                  >
                    {{ isEn() ? '1-Click (Letter resets timer instantly)' : '1-Klick (Buchstabe setzt Timer sofort zurück)' }}
                  </button>
                </div>
              </div>

              <!-- OVERTIME -->
              <div class="opt-row">
                <span>{{ isEn() ? 'Overtime Rule (Last Player Standing):' : 'Overtime-Variante (Letzter verbliebener Spieler):' }}</span>
                <div class="pill-group">
                  <button
                    type="button"
                    class="opt-pill"
                    [class.active]="!overtimeFinalWordRequired()"
                    (click)="overtimeFinalWordRequired.set(false)"
                  >
                    {{ isEn() ? 'Instant Round Win' : 'Sofortiger Rundensieg' }}
                  </button>
                  <button
                    type="button"
                    class="opt-pill"
                    [class.active]="overtimeFinalWordRequired()"
                    (click)="overtimeFinalWordRequired.set(true)"
                  >
                    {{ isEn() ? 'Must Name 1 Final Word' : 'Muss noch 1 finales Wort nennen' }}
                  </button>
                </div>
              </div>

              <button type="button" class="btn-secondary" (click)="resetMatch()">
                🔄 {{ isEn() ? 'Reset Match & All Scores to 0' : 'Komplettes Spiel & Punkte auf 0 zurücksetzen' }}
              </button>
            </div>
          </div>
        </section>
      }

      <!-- MATCH WINNER BANNER -->
      @if (matchWinner(); as champ) {
        <section class="champion-banner glass-panel">
          <div class="champ-left">
            <span class="trophy-icon">🏆</span>
            <div>
              <h2>
                {{ isEn() ? champ.name + ' wins the Tapple Match!' : champ.name + ' gewinnt das Tapple-Match!' }}
              </h2>
              <p>
                {{
                  isEn()
                    ? 'Congratulations! ' + champ.name + ' was the first to collect ' + champ.cardsWon.length + ' category cards.'
                    : 'Herzlichen Glückwunsch! ' + champ.name + ' hat zuerst ' + champ.cardsWon.length + ' Kategoriekarten gesammelt.'
                }}
              </p>
            </div>
          </div>
          <button type="button" class="btn-primary" (click)="resetMatch()">
            🎉 {{ isEn() ? 'Start New Match' : 'Neues Spiel starten' }}
          </button>
        </section>
      }

      <!-- MAIN GAME LAYOUT -->
      <div class="tapple-arena">
        <!-- LEFT SIDEBAR: CARD DECK & PLAYERS -->
        <aside class="left-column">
          <!-- CATEGORY CARD BOX -->
          <div class="card-deck-box glass-panel">
            <div class="deck-header">
              <span class="deck-badge">
                🃏 {{ isEn() ? 'CATEGORY DECK' : 'KATEGORIE-STAPEL' }} ({{ lang().toUpperCase() }})
              </span>
              <button type="button" class="draw-btn" (click)="drawNextCard()">
                🔄 {{ isEn() ? 'Draw Next Card' : 'Neue Karte ziehen' }}
              </button>
            </div>

            @if (drawnCard(); as card) {
              <div class="category-Sides">
                <button
                  type="button"
                  class="cat-side easy"
                  [class.selected]="selectedSide() === 'easy'"
                  (click)="selectCategorySide('easy')"
                >
                  <span class="side-tag">
                    🟦 {{ isEn() ? 'BLUE • STANDARD' : 'BLAU • KLASSISCH' }}
                  </span>
                  <strong>{{ card.easyCategory[lang()] }}</strong>
                </button>

                <button
                  type="button"
                  class="cat-side hard"
                  [class.selected]="selectedSide() === 'hard'"
                  (click)="selectCategorySide('hard')"
                >
                  <span class="side-tag">
                    🟥 {{ isEn() ? 'RED • CHALLENGING' : 'ROT • KNIFFLIG' }}
                  </span>
                  <strong>{{ card.hardCategory[lang()] }}</strong>
                </button>
              </div>
            }

            <!-- CUSTOM CATEGORY INPUT -->
            <div class="custom-cat-row">
              <input
                type="text"
                [ngModel]="customCategory()"
                (ngModelChange)="setCustomCategory($event)"
                [placeholder]="isEn() ? 'Or type your own custom category...' : 'Oder eigene Kategorie eintippen...'"
                class="custom-cat-input"
              />
            </div>

            <!-- ACTIVE CATEGORY DISPLAY -->
            <div class="active-cat-banner">
              <span class="ac-label">{{ isEn() ? 'ACTIVE CATEGORY:' : 'AKTIVE KATEGORIE:' }}</span>
              <h2 class="ac-title">{{ activeCategoryTitle() }}</h2>
              <div class="rule-hints">
                <span>
                  {{ isEn() ? '💡 Ignore articles (The / A / An)!' : '💡 Artikel (Der/Die/Das) zählen nicht!' }}
                </span>
                @if (isPersonCategoryActive()) {
                  <span class="person-hint">
                    {{ isEn() ? '👤 First or Last Name allowed!' : '👤 Vor- & Nachname erlaubt!' }}
                  </span>
                }
              </div>
            </div>
          </div>

          <!-- PLAYERS RING / TURN ORDER -->
          <div class="players-box glass-panel">
            <div class="players-head">
              <h3>👥 {{ isEn() ? 'Players Clockwise' : 'Spieler im Uhrzeigersinn' }}</h3>
              <span>{{ isEn() ? 'Goal:' : 'Ziel:' }} {{ targetCardsToWin() }} 🃏</span>
            </div>

            <div class="players-list">
              @for (p of players(); track p.id; let idx = $index) {
                <div
                  class="player-row"
                  [class.active-turn]="currentPlayerIndex() === idx && roundState() !== 'finished'"
                  [class.eliminated]="p.eliminatedInRound"
                  (click)="selectStartingPlayer(idx)"
                >
                  <div class="p-left">
                    <span class="p-avatar" [style.background]="p.color">
                      {{ p.eliminatedInRound ? '✕' : idx + 1 }}
                    </span>
                    <div>
                      <div class="p-name">
                        {{ p.name }}
                        @if (readerIndex() === idx) {
                          <span class="role-chip">
                            📖 {{ isEn() ? 'Reader' : 'Vorleser' }}
                          </span>
                        }
                        @if (currentPlayerIndex() === idx && roundState() !== 'finished') {
                          <span class="turn-chip">
                            ⚡ {{ isEn() ? 'YOUR TURN' : 'AM ZUG' }}
                          </span>
                        }
                      </div>
                      <div class="p-sub">
                        @if (p.eliminatedInRound) {
                          <span class="elim-text">
                            {{ isEn() ? 'Eliminated this round' : 'In dieser Runde ausgeschieden' }}
                          </span>
                        } @else {
                          <span>
                            {{ isEn() ? 'Ready' : 'Bereit' }} • {{ p.cardsWon.length }} / {{ targetCardsToWin() }}
                            {{ isEn() ? 'cards' : 'Karten' }}
                          </span>
                        }
                      </div>
                    </div>
                  </div>

                  <div class="p-cards-count">
                    @for (c of p.cardsWon; track $index) {
                      <span class="won-card-icon" [title]="c">🃏</span>
                    }
                    <span class="score-num">{{ p.cardsWon.length }}</span>
                  </div>
                </div>
              }
            </div>
          </div>
        </aside>

        <!-- CENTER: THE ELECTRONIC TAPPLE WHEEL -->
        <section class="wheel-column glass-panel">
          <!-- STATUS BANNER ABOVE WHEEL -->
          <div class="wheel-status-bar" [attr.data-state]="roundState()">
            <div class="status-main">
              <span class="state-dot"></span>
              <strong>{{ statusBannerTitle() }}</strong>
            </div>
            <span class="status-sub">{{ statusBannerSub() }}</span>
          </div>

          <!-- THE CIRCULAR TAPPLE WHEEL -->
          <div class="tapple-wheel-wrapper">
            <div
              class="tapple-wheel"
              [class.ticking]="timerRunning()"
              [class.danger]="timerRunning() && timeLeft() <= 3.0"
              [class.buzzer-shake]="buzzerActive()"
            >
              <div class="wheel-outer-rim"></div>

              <!-- 26 RADIAL LETTER KEYS (A-Z) ARRANGED IN A 360° CIRCLE -->
              @for (letter of letters; track letter; let i = $index) {
                <div
                  class="letter-slot"
                  [style.transform]="'rotate(' + (i * 360) / letters.length + 'deg)'"
                >
                  <button
                    type="button"
                    class="letter-key"
                    [class.pressed]="isLetterUsed(letter)"
                    [class.pending]="pendingLetter() === letter"
                    [disabled]="isLetterUsed(letter) || roundState() === 'finished' || buzzerActive()"
                    (click)="pressLetter(letter)"
                  >
                    <span
                      class="letter-char"
                      [style.transform]="'rotate(' + -(i * 360) / letters.length + 'deg)'"
                    >
                      {{ letter }}
                    </span>
                    <span class="key-ridge"></span>
                  </button>
                </div>
              }

              <!-- INNER HUB & BIG RED 10-SECOND TIMER BUTTON -->
              <div class="wheel-center-hub">
                <svg class="timer-ring-svg" viewBox="0 0 180 180">
                  <circle class="ring-bg" cx="90" cy="90" r="80" />
                  <circle
                    class="ring-progress"
                    [class.urgent]="timeLeft() <= 3.0"
                    cx="90"
                    cy="90"
                    r="80"
                    [style.stroke-dashoffset]="timerDashOffset()"
                  />
                </svg>

                <!-- THE BIG RED CENTER BUTTON -->
                <button
                  type="button"
                  class="red-center-btn"
                  [class.ready-pulse]="!!pendingLetter() || roundState() === 'idle' || buzzerActive()"
                  [class.running]="timerRunning() && !pendingLetter()"
                  (click)="hitRedCenterButton()"
                >
                  <span class="tapple-brand">TAPPLE</span>
                  <span class="timer-digits">{{ formattedTime() }}s</span>
                  <span class="center-action-label">
                    @if (roundState() === 'finished') {
                      🔄 {{ isEn() ? 'NEXT ROUND' : 'NEUE RUNDE' }}
                    } @else if (buzzerActive()) {
                      ▶️ {{ isEn() ? 'CONTINUE' : 'WEITER' }} ({{ currentPlayer()?.name }})
                    } @else if (!timerRunning()) {
                      🔴 {{ isEn() ? 'START TIMER' : 'TIMER STARTEN' }}
                    } @else if (pendingLetter()) {
                      🔴 {{ isEn() ? 'HIT BUTTON!' : 'SCHLAGEN!' }} ({{ pendingLetter() }})
                    } @else {
                      {{ isEn() ? 'PICK A LETTER' : 'BUCHSTABE WÄHLEN' }}
                    }
                  </span>
                </button>
              </div>
            </div>
          </div>

          <!-- WORD HELPER INPUT & HARDWARE CONTROLS -->
          <div class="wheel-bottom-controls">
            <div class="word-helper-bar">
              <span class="wh-icon">🗣️</span>
              <input
                type="text"
                [ngModel]="spokenWord()"
                (ngModelChange)="onSpokenWordInput($event)"
                (keydown.enter)="submitSpokenWord()"
                [placeholder]="
                  isEn()
                    ? 'Optional: Type word (e.g. &quot;The Godfather&quot; → auto-selects G) & press Enter...'
                    : 'Optional: Begriff eintippen (z.B. &quot;Der Pate&quot; → erkennt automatisch P) & Enter...'
                "
                class="wh-input"
              />
              @if (detectedLetter(); as dl) {
                <span class="detected-chip" [class.taken]="isLetterUsed(dl)">
                  {{ isEn() ? 'Key:' : 'Taste:' }} <strong>{{ dl }}</strong>
                  {{ isLetterUsed(dl) ? (isEn() ? '(already down!)' : '(bereits unten!)') : '✓' }}
                </span>
              }
            </div>

            <div class="hardware-actions">
              <button
                type="button"
                class="lever-btn"
                [class.highlight]="remainingLettersCount() === 0"
                (click)="pullResetLever()"
              >
                🕹️ {{ isEn() ? 'Reset Lever' : 'Reset-Hebel' }} ({{ remainingLettersCount() }}/{{ letters.length }}
                {{ isEn() ? 'keys up' : 'Tasten oben' }})
              </button>

              @if (timerRunning() || roundState() === 'running') {
                <button
                  type="button"
                  class="btn-eliminate"
                  (click)="triggerBuzzer(isEn() ? 'Invalid word / Time out' : 'Ungültiges Wort / Zeit abgelaufen')"
                >
                  🚨 {{ isEn() ? 'Invalid Word / Eliminate' : 'Ungültiges Wort / Ausscheiden' }}
                </button>
              }
            </div>
          </div>

          <!-- ROUND LOG -->
          @if (wordLog().length > 0) {
            <div class="round-log">
              <span class="log-label">
                {{ isEn() ? 'Round History' : 'Runden-Verlauf' }} ({{ wordsFoundThisRound() }}
                {{ isEn() ? 'words' : 'Begriffe' }}):
              </span>
              <div class="log-chips">
                @for (entry of wordLog(); track $index) {
                  <span class="log-chip" [style.border-color]="entry.playerColor">
                    <strong [style.color]="entry.playerColor">{{ entry.letter }}</strong>
                    <span>{{ entry.word || entry.player }}</span>
                  </span>
                }
              </div>
            </div>
          }
        </section>
      </div>
    </div>
  `,
  styles: [`
    .tapple-page {
      display: flex;
      flex-direction: column;
      gap: 1.35rem;
      padding-bottom: 3rem;
    }

    .topbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.85rem;
    }

    .back-btn {
      padding: 0.55rem 1rem;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--border-subtle);
      color: var(--text-secondary);
      font-weight: 600;
      font-size: 0.88rem;
    }

    .top-controls {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.6rem;
    }

    .lang-switch-group {
      display: inline-flex;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid var(--border-subtle);
      border-radius: 10px;
      padding: 0.18rem;
      gap: 0.2rem;
    }

    .lang-btn {
      padding: 0.32rem 0.65rem;
      border-radius: 7px;
      border: none;
      background: transparent;
      color: var(--text-secondary);
      font-size: 0.76rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.18s ease;
    }

    .lang-btn.active {
      background: rgba(244, 63, 94, 0.22);
      color: #fff;
    }

    .switch-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.48rem 0.9rem;
      border-radius: 999px;
      border: 1px solid var(--border-subtle);
      background: rgba(255, 255, 255, 0.04);
      color: var(--text-secondary);
      font-size: 0.78rem;
      font-weight: 700;
      cursor: pointer;
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
    .rules-panel, .setup-panel {
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1.15rem;
      border-color: rgba(244, 63, 94, 0.35);
    }

    .rules-head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1rem;
    }

    .rules-head h3 { margin: 0; font-size: 1.15rem; }
    .rules-head p { margin: 0.2rem 0 0; font-size: 0.85rem; color: var(--text-secondary); }

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

    .rule-card h4 { margin: 0 0 0.4rem; font-size: 0.95rem; color: #fda4af; }
    .rule-card p { margin: 0; font-size: 0.82rem; line-height: 1.5; color: var(--text-secondary); }

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
      font-size: 0.8rem;
      color: var(--text-secondary);
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
      gap: 0.9rem;
    }

    .opt-row {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
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
      background: rgba(244, 63, 94, 0.2);
      border-color: #f43f5e;
      color: #fff;
    }

    /* CHAMPION BANNER */
    .champion-banner {
      padding: 1.5rem 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
      background: linear-gradient(135deg, rgba(245, 158, 11, 0.22), rgba(244, 63, 94, 0.22));
      border-color: rgba(245, 158, 11, 0.55);
    }

    .champ-left {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .trophy-icon { font-size: 2.6rem; }
    .champ-left h2 { margin: 0; font-family: var(--font-display); font-size: 1.5rem; }
    .champ-left p { margin: 0.2rem 0 0; color: var(--text-secondary); font-size: 0.9rem; }

    /* MAIN ARENA */
    .tapple-arena {
      display: grid;
      grid-template-columns: 390px 1fr;
      gap: 1.5rem;
      align-items: start;
    }

    .left-column {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .card-deck-box {
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
      font-weight: 700;
      letter-spacing: 0.06em;
      color: #fda4af;
    }

    .draw-btn {
      padding: 0.4rem 0.8rem;
      border-radius: 10px;
      border: 1px solid rgba(244, 63, 94, 0.4);
      background: rgba(244, 63, 94, 0.16);
      color: #fecdd3;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
    }

    .draw-btn:hover {
      background: rgba(244, 63, 94, 0.28);
    }

    .category-Sides {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.6rem;
    }

    .cat-side {
      padding: 0.75rem;
      border-radius: 12px;
      border: 1px solid var(--border-subtle);
      background: rgba(255, 255, 255, 0.03);
      color: var(--text-primary);
      text-align: left;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
      transition: all 0.18s ease;
    }

    .cat-side .side-tag {
      font-size: 0.65rem;
      font-weight: 700;
      letter-spacing: 0.05em;
    }

    .cat-side.easy .side-tag { color: #38bdf8; }
    .cat-side.hard .side-tag { color: #fb7185; }

    .cat-side strong {
      font-size: 0.86rem;
      line-height: 1.3;
    }

    .cat-side.easy.selected {
      background: rgba(14, 165, 233, 0.16);
      border-color: #38bdf8;
    }

    .cat-side.hard.selected {
      background: rgba(244, 63, 94, 0.16);
      border-color: #f43f5e;
    }

    .custom-cat-input {
      width: 100%;
      padding: 0.55rem 0.8rem;
      border-radius: 10px;
      border: 1px solid var(--border-subtle);
      background: rgba(0, 0, 0, 0.35);
      color: var(--text-primary);
      font-size: 0.82rem;
    }

    .active-cat-banner {
      padding: 1rem;
      border-radius: 14px;
      background: linear-gradient(145deg, rgba(30, 41, 59, 0.75), rgba(15, 23, 42, 0.9));
      border: 1px solid rgba(255, 255, 255, 0.12);
      text-align: center;
    }

    .ac-label {
      font-size: 0.68rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      color: var(--text-muted);
    }

    .ac-title {
      margin: 0.25rem 0 0.5rem;
      font-family: var(--font-display);
      font-size: 1.35rem;
      color: #fff;
    }

    .rule-hints {
      display: flex;
      justify-content: center;
      flex-wrap: wrap;
      gap: 0.45rem;
      font-size: 0.72rem;
      color: var(--text-secondary);
    }

    .person-hint {
      color: #fde047;
      font-weight: 600;
    }

    /* PLAYERS BOX */
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

    .players-head h3 { margin: 0; font-size: 1rem; }
    .players-head span { font-size: 0.8rem; color: var(--text-secondary); font-weight: 600; }

    .players-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .player-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.68rem 0.85rem;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--border-subtle);
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .player-row.active-turn {
      background: rgba(244, 63, 94, 0.15);
      border-color: #f43f5e;
      box-shadow: 0 0 18px rgba(244, 63, 94, 0.22);
    }

    .player-row.eliminated {
      opacity: 0.42;
      filter: grayscale(0.6);
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
      gap: 0.4rem;
      flex-wrap: wrap;
    }

    .role-chip {
      font-size: 0.65rem;
      padding: 0.1rem 0.4rem;
      border-radius: 5px;
      background: rgba(255, 255, 255, 0.08);
      color: var(--text-secondary);
    }

    .turn-chip {
      font-size: 0.65rem;
      padding: 0.12rem 0.45rem;
      border-radius: 5px;
      background: #f43f5e;
      color: #fff;
      font-weight: 800;
    }

    .p-sub {
      font-size: 0.74rem;
      color: var(--text-secondary);
      margin-top: 0.1rem;
    }

    .elim-text { color: #fca5a5; }

    .p-cards-count {
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }

    .score-num {
      font-family: var(--font-display);
      font-weight: 800;
      font-size: 1.05rem;
      margin-left: 0.25rem;
    }

    /* ============================================================
       THE CIRCULAR ELECTRONIC TAPPLE WHEEL
       ============================================================ */
    .wheel-column {
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1.35rem;
    }

    .wheel-status-bar {
      width: 100%;
      padding: 0.85rem 1.2rem;
      border-radius: 14px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid var(--border-subtle);
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .wheel-status-bar[data-state='running'] {
      border-color: rgba(6, 182, 212, 0.45);
      background: rgba(6, 182, 212, 0.1);
    }

    .wheel-status-bar[data-state='buzzer'] {
      border-color: rgba(239, 68, 68, 0.6);
      background: rgba(239, 68, 68, 0.18);
    }

    .wheel-status-bar[data-state='finished'] {
      border-color: rgba(16, 185, 129, 0.5);
      background: rgba(16, 185, 129, 0.15);
    }

    .status-main {
      display: flex;
      align-items: center;
      gap: 0.55rem;
      font-size: 0.95rem;
    }

    .state-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #22d3ee;
      box-shadow: 0 0 10px #22d3ee;
    }

    .status-sub {
      font-size: 0.82rem;
      color: var(--text-secondary);
    }

    .tapple-wheel-wrapper {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 0.75rem;
    }

    .tapple-wheel {
      position: relative;
      width: 520px;
      height: 520px;
      border-radius: 50%;
      background: radial-gradient(
        circle at 50% 45%,
        #1e293b 0%,
        #0f172a 58%,
        #090d16 100%
      );
      border: 10px solid #1e2638;
      box-shadow:
        0 28px 60px rgba(0, 0, 0, 0.75),
        inset 0 4px 18px rgba(255, 255, 255, 0.12),
        inset 0 -10px 25px rgba(0, 0, 0, 0.8);
      display: grid;
      place-items: center;
      user-select: none;
      transition: box-shadow 0.25s ease;
    }

    .tapple-wheel.ticking {
      box-shadow:
        0 0 45px rgba(6, 182, 212, 0.28),
        0 28px 60px rgba(0, 0, 0, 0.75),
        inset 0 4px 18px rgba(255, 255, 255, 0.15);
    }

    .tapple-wheel.danger {
      box-shadow:
        0 0 65px rgba(244, 63, 94, 0.55),
        0 28px 60px rgba(0, 0, 0, 0.75);
      border-color: rgba(244, 63, 94, 0.6);
    }

    .tapple-wheel.buzzer-shake {
      animation: shakeWheel 0.45s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
      border-color: #ef4444;
    }

    @keyframes shakeWheel {
      10%, 90% { transform: translate3d(-4px, 0, 0); }
      20%, 80% { transform: translate3d(6px, 0, 0); }
      30%, 50%, 70% { transform: translate3d(-8px, 0, 0); }
      40%, 60% { transform: translate3d(8px, 0, 0); }
    }

    .wheel-outer-rim {
      position: absolute;
      inset: 14px;
      border-radius: 50%;
      border: 2px dashed rgba(255, 255, 255, 0.08);
      pointer-events: none;
    }

    /* 20 LETTER SLOTS AROUND THE CIRCLE */
    .letter-slot {
      position: absolute;
      top: 50%;
      left: 50%;
      width: 0;
      height: 0;
    }

    .letter-key {
      position: absolute;
      left: -21px;
      top: -242px;
      width: 42px;
      height: 82px;
      border-radius: 11px 11px 15px 15px;
      border: 2px solid rgba(255, 255, 255, 0.22);
      background: linear-gradient(180deg, #f8fafc 0%, #e2e8f0 70%, #cbd5e1 100%);
      color: #0f172a;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      padding: 0.55rem 0 0.4rem;
      box-shadow:
        0 7px 0 #64748b,
        0 10px 16px rgba(0, 0, 0, 0.55);
      transition: transform 0.14s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.14s ease, background 0.15s ease;
    }

    .letter-key:hover:not(:disabled) {
      transform: translateY(-3px);
      background: linear-gradient(180deg, #ffffff 0%, #f1f5f9 100%);
      border-color: #38bdf8;
      box-shadow:
        0 10px 0 #475569,
        0 14px 24px rgba(56, 189, 248, 0.4);
    }

    /* PENDING LETTER (SELECTED THIS TURN, WAITING FOR RED BUTTON) */
    .letter-key.pending {
      transform: translateY(5px);
      background: linear-gradient(180deg, #fde047 0%, #f59e0b 100%);
      color: #0f172a;
      border-color: #fef08a;
      box-shadow:
        0 3px 0 #b45309,
        0 0 22px rgba(245, 158, 11, 0.8);
    }

    /* PRESSED / LOCKED DOWN LETTER KEY */
    .letter-key.pressed {
      transform: translateY(7px) scale(0.95);
      background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
      color: rgba(148, 163, 184, 0.35);
      border-color: rgba(255, 255, 255, 0.05);
      box-shadow:
        inset 0 3px 6px rgba(0, 0, 0, 0.85),
        0 1px 0 #090d16;
      cursor: not-allowed;
    }

    .letter-char {
      display: inline-block;
      font-family: var(--font-display);
      font-size: 1.22rem;
      font-weight: 800;
      line-height: 1;
    }

    .key-ridge {
      width: 18px;
      height: 4px;
      border-radius: 999px;
      background: rgba(15, 23, 42, 0.25);
    }

    .letter-key.pressed .key-ridge {
      background: rgba(244, 63, 94, 0.35);
    }

    /* CENTER HUB & BIG RED TIMER BUTTON */
    .wheel-center-hub {
      position: relative;
      width: 224px;
      height: 224px;
      border-radius: 50%;
      background: radial-gradient(circle, #0f172a 0%, #05070c 100%);
      border: 6px solid #263147;
      box-shadow:
        inset 0 6px 16px rgba(0, 0, 0, 0.85),
        0 8px 25px rgba(0, 0, 0, 0.65);
      display: grid;
      place-items: center;
      z-index: 5;
    }

    .timer-ring-svg {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      transform: rotate(-90deg);
      pointer-events: none;
    }

    .ring-bg {
      fill: none;
      stroke: rgba(255, 255, 255, 0.08);
      stroke-width: 8;
    }

    .ring-progress {
      fill: none;
      stroke: #22d3ee;
      stroke-width: 8;
      stroke-linecap: round;
      stroke-dasharray: 502.65;
      transition: stroke-dashoffset 0.1s linear, stroke 0.2s ease;
    }

    .ring-progress.urgent {
      stroke: #f43f5e;
    }

    .red-center-btn {
      position: relative;
      width: 168px;
      height: 168px;
      border-radius: 50%;
      border: 4px solid rgba(255, 255, 255, 0.25);
      background: radial-gradient(circle at 35% 30%, #fb7185 0%, #e11d48 48%, #9f1239 100%);
      color: #fff;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.2rem;
      padding: 0.75rem;
      text-align: center;
      box-shadow:
        0 10px 0 #881337,
        0 16px 32px rgba(225, 29, 72, 0.55),
        inset 0 3px 10px rgba(255, 255, 255, 0.45);
      transition: transform 0.1s ease, box-shadow 0.1s ease;
    }

    .red-center-btn:active {
      transform: translateY(6px);
      box-shadow:
        0 4px 0 #881337,
        0 8px 18px rgba(225, 29, 72, 0.45);
    }

    .red-center-btn.ready-pulse {
      animation: redPulse 1.2s infinite;
    }

    @keyframes redPulse {
      0%, 100% { box-shadow: 0 10px 0 #881337, 0 0 25px rgba(244, 63, 94, 0.65); }
      50% { box-shadow: 0 10px 0 #881337, 0 0 48px rgba(251, 113, 133, 0.95); }
    }

    .tapple-brand {
      font-family: var(--font-display);
      font-size: 0.85rem;
      font-weight: 900;
      letter-spacing: 0.16em;
      opacity: 0.9;
    }

    .timer-digits {
      font-family: var(--font-mono);
      font-size: 2.05rem;
      font-weight: 800;
      line-height: 1.05;
      text-shadow: 0 2px 8px rgba(0, 0, 0, 0.45);
    }

    .center-action-label {
      font-size: 0.68rem;
      font-weight: 800;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      background: rgba(0, 0, 0, 0.28);
      padding: 0.22rem 0.55rem;
      border-radius: 999px;
      max-width: 140px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* BOTTOM CONTROLS & WORD HELPER */
    .wheel-bottom-controls {
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .word-helper-bar {
      position: relative;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: rgba(0, 0, 0, 0.35);
      border: 1px solid var(--border-subtle);
      border-radius: 12px;
      padding: 0.45rem 0.75rem;
    }

    .wh-input {
      flex: 1;
      background: transparent;
      border: none;
      color: var(--text-primary);
      font-size: 0.88rem;
      outline: none;
    }

    .detected-chip {
      padding: 0.25rem 0.6rem;
      border-radius: 8px;
      font-size: 0.76rem;
      background: rgba(16, 185, 129, 0.16);
      color: #6ee7b7;
      white-space: nowrap;
    }

    .detected-chip.taken {
      background: rgba(239, 68, 68, 0.18);
      color: #fca5a5;
    }

    .hardware-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.65rem;
    }

    .lever-btn {
      padding: 0.6rem 1.05rem;
      border-radius: 12px;
      border: 1px solid rgba(56, 189, 248, 0.35);
      background: rgba(14, 165, 233, 0.12);
      color: #7dd3fc;
      font-weight: 700;
      font-size: 0.84rem;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .lever-btn.highlight {
      background: linear-gradient(135deg, #06b6d4, #3b82f6);
      color: #fff;
      box-shadow: 0 0 20px rgba(6, 182, 212, 0.55);
    }

    .btn-eliminate {
      padding: 0.6rem 1.05rem;
      border-radius: 12px;
      border: 1px solid rgba(239, 68, 68, 0.45);
      background: rgba(239, 68, 68, 0.16);
      color: #fca5a5;
      font-weight: 700;
      font-size: 0.84rem;
      cursor: pointer;
    }

    .round-log {
      width: 100%;
      padding-top: 0.85rem;
      border-top: 1px solid var(--border-subtle);
      display: flex;
      flex-direction: column;
      gap: 0.45rem;
    }

    .log-label {
      font-size: 0.76rem;
      color: var(--text-muted);
      font-weight: 600;
    }

    .log-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
    }

    .log-chip {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.24rem 0.6rem;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid var(--border-subtle);
      font-size: 0.78rem;
    }

    @media (max-width: 1024px) {
      .tapple-arena {
        grid-template-columns: 1fr;
      }
      .setup-columns {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 600px) {
      .tapple-wheel {
        transform: scale(0.68);
        margin: -75px 0;
      }
    }
  `],
})
export class TappleGameComponent implements OnDestroy {
  protected readonly languageService = inject(LanguageService);
  readonly letters = TAPPLE_LETTERS;

  // Global & locally persisted language
  readonly lang = this.languageService.currentLang;
  readonly isEn = this.languageService.isEn;

  // Power & Modals
  readonly powerOn = signal<boolean>(true);
  readonly showRulesModal = signal<boolean>(false);
  readonly showSetupModal = signal<boolean>(false);

  // Settings / House Rules
  readonly targetCardsToWin = signal<number>(3);
  readonly instantPassMode = signal<boolean>(false);
  readonly overtimeFinalWordRequired = signal<boolean>(false);

  // Players (2 to 8) — persisted in localStorage across all games
  readonly players = signal<TapplePlayer[]>(
    loadSavedPlayerNames(['Spieler 1', 'Spieler 2', 'Spieler 3']).map((name, idx) => ({
      id: idx + 1,
      name,
      color: PLAYER_COLORS[idx % PLAYER_COLORS.length],
      cardsWon: [],
      eliminatedInRound: false,
    }))
  );
  readonly newPlayerName = signal<string>('');
  readonly readerIndex = signal<number>(0);
  readonly currentPlayerIndex = signal<number>(1);

  // Cards & Categories (100 zweiseitige Karten = 200 Kategorien, gemischt)
  private readonly shuffledDeck: TappleCard[] = [...TAPPLE_CARDS_DECK].sort(() => Math.random() - 0.5);
  private deckIndex = 0;
  readonly drawnCard = signal<TappleCard>(this.shuffledDeck[0]);
  readonly selectedSide = signal<'easy' | 'hard'>('easy');
  readonly customCategory = signal<string>('');

  // Wheel & Timer State
  readonly usedLetters = signal<string[]>([]);
  readonly pendingLetter = signal<string | null>(null);
  readonly roundState = signal<'idle' | 'running' | 'buzzer' | 'finished'>('idle');
  readonly timerRunning = signal<boolean>(false);
  readonly buzzerActive = signal<boolean>(false);
  readonly timeLeft = signal<number>(10.0);
  readonly statusMessage = signal<string>('');
  readonly finalWordPendingForWinner = signal<boolean>(false);

  // Spoken Word Input Helper
  readonly spokenWord = signal<string>('');
  readonly wordLog = signal<WordLogEntry[]>([]);
  readonly wordsFoundThisRound = signal<number>(0);

  private timerInterval: ReturnType<typeof setInterval> | null = null;
  private lastWholeSecond = 10;
  private audioCtx: AudioContext | null = null;

  readonly currentPlayer = computed(() => this.players()[this.currentPlayerIndex()] || null);

  readonly matchWinner = computed(() =>
    this.players().find((p) => p.cardsWon.length >= this.targetCardsToWin()) || null
  );

  readonly remainingLettersCount = computed(
    () => this.letters.length - this.usedLetters().length
  );

  readonly activeCategoryTitle = computed(() => {
    const custom = this.customCategory().trim();
    if (custom) return custom;
    const card = this.drawnCard();
    const l = this.lang();
    return this.selectedSide() === 'easy' ? card.easyCategory[l] : card.hardCategory[l];
  });

  readonly isPersonCategoryActive = computed(() => {
    if (this.customCategory().trim()) return false;
    return !!this.drawnCard().isPersonCategory && this.selectedSide() === 'hard';
  });

  readonly formattedTime = computed(() => this.timeLeft().toFixed(1));

  readonly timerDashOffset = computed(() => {
    const circumference = 2 * Math.PI * 80; // ~502.65
    const fraction = Math.max(0, Math.min(1, this.timeLeft() / 10.0));
    return circumference * (1 - fraction);
  });

  readonly detectedLetter = computed(() => {
    const raw = this.spokenWord().trim();
    if (!raw) return null;
    // Ignoriere führende deutsche & englische Artikel gemäß offizieller Tapple-Regel
    const stripped = raw.replace(/^(der|die|das|ein|eine|einer|eines|the|a|an)\s+/i, '').trim();
    if (!stripped) return null;
    const firstChar = stripped[0].toUpperCase();
    const mapped = firstChar
      .replace('Ä', 'A')
      .replace('Ö', 'O')
      .replace('Ü', 'U');
    return this.letters.includes(mapped) ? mapped : null;
  });

  readonly statusBannerTitle = computed(() => {
    if (this.statusMessage()) return this.statusMessage();
    const p = this.currentPlayer();
    const en = this.isEn();
    if (this.roundState() === 'idle') {
      return en
        ? `Round Start: ${p?.name || 'Player'} starts!`
        : `Rundenstart: ${p?.name || 'Spieler'} beginnt!`;
    }
    if (this.roundState() === 'running') {
      if (this.pendingLetter()) {
        return en
          ? `Letter "${this.pendingLetter()}" pressed! Now HIT THE RED BUTTON!`
          : `Buchstabe "${this.pendingLetter()}" gedrückt! Jetzt ROTEN KNOPF schlagen!`;
      }
      return en
        ? `${p?.name || 'Player'}'s turn (10 seconds)!`
        : `${p?.name || 'Spieler'} ist am Zug (10 Sekunden)!`;
    }
    return en ? 'Ready' : 'Bereit';
  });

  readonly statusBannerSub = computed(() => {
    const en = this.isEn();
    if (this.roundState() === 'idle') {
      return en
        ? 'Read the category aloud and press the big red button in the center (or Spacebar).'
        : 'Kategorie vorlesen und auf den großen roten Knopf in der Mitte drücken (oder Leertaste).';
    }
    if (this.roundState() === 'running') {
      if (this.instantPassMode()) {
        return en
          ? 'Press an available letter on the wheel (or type it on your keyboard).'
          : 'Drücke einen freien Buchstaben auf dem Rad (oder tippe ihn auf der Tastatur).';
      }
      return en
        ? '1. Press a letter key → 2. Immediately hit the red center button (or Spacebar)!'
        : '1. Buchstaben drücken → 2. Sofort auf den roten Knopf in der Mitte schlagen (oder Leertaste)!';
    }
    if (this.roundState() === 'buzzer') {
      return en
        ? 'Press the red center button to continue the round with the remaining letters.'
        : 'Drücke auf den roten Knopf in der Mitte, um mit den verbleibenden Buchstaben weiterzuspielen.';
    }
    return en
      ? 'Click the red center button to start the next round.'
      : 'Klicke auf den roten Knopf in der Mitte für die nächste Runde.';
  });

  ngOnDestroy(): void {
    this.stopTimer();
  }

  setLanguage(l: TappleLang): void {
    this.languageService.setLanguage(l);
    this.statusMessage.set('');
    // Passe Standard-Spielernamen sanft an, falls sie noch unverändert sind
    this.players.update((list) =>
      list.map((p, idx) => {
        if (l === 'en' && p.name === `Spieler ${idx + 1}`) {
          return { ...p, name: `Player ${idx + 1}` };
        }
        if (l === 'de' && p.name === `Player ${idx + 1}`) {
          return { ...p, name: `Spieler ${idx + 1}` };
        }
        return p;
      })
    );
  }

  togglePower(): void {
    this.powerOn.set(!this.powerOn());
    if (this.powerOn()) {
      this.playTone(660, 0.08, 'sine');
    }
  }

  drawNextCard(): void {
    this.stopTimer();
    this.deckIndex = (this.deckIndex + 1) % this.shuffledDeck.length;
    this.drawnCard.set(this.shuffledDeck[this.deckIndex]);
    this.customCategory.set('');
    this.prepareNewRound(false);
    this.playTone(520, 0.07, 'triangle');
  }

  selectCategorySide(side: 'easy' | 'hard'): void {
    this.selectedSide.set(side);
    this.customCategory.set('');
  }

  setCustomCategory(val: string): void {
    this.customCategory.set(val);
  }

  selectStartingPlayer(idx: number): void {
    if (this.timerRunning()) return;
    const target = this.players()[idx];
    if (target && !target.eliminatedInRound) {
      this.currentPlayerIndex.set(idx);
    }
  }

  isLetterUsed(letter: string): boolean {
    return this.usedLetters().includes(letter);
  }

  pressLetter(letter: string, customWord?: string): void {
    if (this.roundState() === 'finished' || this.buzzerActive()) return;
    if (this.isLetterUsed(letter)) return;

    if (this.roundState() === 'idle') {
      this.roundState.set('running');
      this.startCountdown();
    }

    this.playTone(740, 0.06, 'triangle');
    this.pendingLetter.set(letter);

    if (customWord) {
      this.spokenWord.set(customWord);
    }

    if (this.instantPassMode()) {
      this.confirmLetterAndPassTurn();
    }
  }

  hitRedCenterButton(): void {
    if (this.roundState() === 'finished') {
      this.drawNextCard();
      return;
    }

    if (this.buzzerActive()) {
      this.buzzerActive.set(false);
      this.roundState.set('running');
      this.statusMessage.set('');
      this.startCountdown();
      this.playTone(600, 0.08, 'sine');
      return;
    }

    if (!this.timerRunning()) {
      this.roundState.set('running');
      this.statusMessage.set('');
      this.startCountdown();
      this.playTone(600, 0.08, 'sine');
      return;
    }

    if (this.pendingLetter()) {
      this.confirmLetterAndPassTurn();
    }
  }

  private confirmLetterAndPassTurn(): void {
    const letter = this.pendingLetter();
    if (!letter) return;

    const current = this.currentPlayer();
    const wordText = this.spokenWord().trim();

    this.usedLetters.update((list) => [...list, letter]);
    this.pendingLetter.set(null);
    this.spokenWord.set('');
    this.wordsFoundThisRound.update((n) => n + 1);

    if (current) {
      this.wordLog.update((log) => [
        {
          player: current.name,
          playerColor: current.color,
          letter,
          word: wordText ? `${wordText} (${current.name})` : current.name,
        },
        ...log,
      ]);
    }

    this.playTone(880, 0.09, 'sine');

    if (this.finalWordPendingForWinner() && current) {
      this.finalWordPendingForWinner.set(false);
      this.awardRoundToPlayer(current.id);
      return;
    }

    if (this.usedLetters().length >= this.letters.length) {
      this.pullResetLever(true);
    }

    this.advanceToNextActivePlayer();
    this.startCountdown();
  }

  onSpokenWordInput(val: string): void {
    this.spokenWord.set(val);
  }

  submitSpokenWord(): void {
    const letter = this.detectedLetter();
    if (!letter || this.isLetterUsed(letter)) return;
    this.pressLetter(letter, this.spokenWord());
    if (!this.instantPassMode()) {
      this.confirmLetterAndPassTurn();
    }
  }

  pullResetLever(autoDuringTurn = false): void {
    this.usedLetters.set([]);
    this.pendingLetter.set(null);
    this.playTone(500, 0.06, 'sine');
    setTimeout(() => this.playTone(720, 0.08, 'sine'), 70);
    if (autoDuringTurn) {
      this.statusMessage.set(
        this.isEn()
          ? '🕹️ All 26 letters used! Reset lever triggered — all 26 keys are back up!'
          : '🕹️ Alle 26 Buchstaben verbraucht! Reset-Hebel ausgelöst – alle 26 Tasten sind wieder oben!'
      );
    }
  }

  private startCountdown(): void {
    this.stopTimer();
    this.timeLeft.set(10.0);
    this.lastWholeSecond = 10;
    this.timerRunning.set(true);

    this.timerInterval = setInterval(() => {
      const next = Math.max(0, +(this.timeLeft() - 0.1).toFixed(1));
      this.timeLeft.set(next);

      const ceilSec = Math.ceil(next);
      if (ceilSec < this.lastWholeSecond && ceilSec > 0) {
        this.lastWholeSecond = ceilSec;
        this.playTone(ceilSec <= 3 ? 980 : 720, 0.03, 'square');
      }

      if (next <= 0) {
        this.triggerBuzzer(
          this.isEn()
            ? '⏰ 10 seconds are up! Buzzer sounds!'
            : '⏰ 10 Sekunden abgelaufen! Buzzer ertönt!'
        );
      }
    }, 100);
  }

  private stopTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    this.timerRunning.set(false);
  }

  triggerBuzzer(reason: string): void {
    this.stopTimer();
    this.pendingLetter.set(null);
    this.buzzerActive.set(true);
    this.roundState.set('buzzer');
    this.playBuzzerSound();

    const current = this.currentPlayer();
    if (!current) return;

    this.players.update((list) =>
      list.map((p) => (p.id === current.id ? { ...p, eliminatedInRound: true } : p))
    );

    const remaining = this.players().filter((p) => !p.eliminatedInRound);

    if (remaining.length === 0) {
      this.statusMessage.set(
        this.isEn()
          ? '🔄 Overtime! No player found a word — put card under the deck and draw a new one!'
          : '🔄 Overtime! Kein Spieler hat ein Wort geschafft – Karte kommt unter den Stapel, zieht eine neue!'
      );
      this.roundState.set('finished');
      this.buzzerActive.set(false);
      return;
    }

    if (remaining.length === 1) {
      const lastPlayer = remaining[0];
      const lastIdx = this.players().findIndex((p) => p.id === lastPlayer.id);
      this.currentPlayerIndex.set(lastIdx);

      if (this.overtimeFinalWordRequired() && !this.finalWordPendingForWinner()) {
        this.finalWordPendingForWinner.set(true);
        this.statusMessage.set(
          this.isEn()
            ? `🔥 ${current.name} is out! ${lastPlayer.name} must name 1 final word to claim the card!`
            : `🔥 ${current.name} ist raus! ${lastPlayer.name} muss noch 1 finales Wort nennen, um die Karte zu sichern!`
        );
        return;
      }

      this.awardRoundToPlayer(lastPlayer.id);
      return;
    }

    this.advanceToNextActivePlayer();
    const nextP = this.currentPlayer();
    this.statusMessage.set(
      this.isEn()
        ? `🚨 ${current.name} is out (${reason})! ${nextP?.name} hits the red button to continue.`
        : `🚨 ${current.name} scheidet aus (${reason})! ${nextP?.name} drückt den roten Knopf und spielt weiter.`
    );
  }

  private awardRoundToPlayer(winnerId: number): void {
    this.stopTimer();
    this.buzzerActive.set(false);
    this.roundState.set('finished');
    const categoryWon = this.activeCategoryTitle();

    this.players.update((list) =>
      list.map((p) =>
        p.id === winnerId ? { ...p, cardsWon: [...p.cardsWon, categoryWon] } : p
      )
    );

    const winner = this.players().find((p) => p.id === winnerId);
    this.statusMessage.set(
      this.isEn()
        ? `🏆 ${winner?.name} wins the round and claims the card "${categoryWon}"!`
        : `🏆 ${winner?.name} gewinnt die Runde und erhält die Karte „${categoryWon}“!`
    );
    this.playWinFanfare();
  }

  private advanceToNextActivePlayer(): void {
    const list = this.players();
    const total = list.length;
    let idx = this.currentPlayerIndex();
    for (let step = 1; step <= total; step++) {
      const candidateIdx = (idx + step) % total;
      if (!list[candidateIdx].eliminatedInRound) {
        this.currentPlayerIndex.set(candidateIdx);
        return;
      }
    }
  }

  private prepareNewRound(keepReader = false): void {
    this.stopTimer();
    this.usedLetters.set([]);
    this.pendingLetter.set(null);
    this.wordLog.set([]);
    this.wordsFoundThisRound.set(0);
    this.finalWordPendingForWinner.set(false);
    this.buzzerActive.set(false);
    this.roundState.set('idle');
    this.timeLeft.set(10.0);
    this.statusMessage.set('');

    this.players.update((list) => list.map((p) => ({ ...p, eliminatedInRound: false })));

    const total = this.players().length;
    const nextReader = keepReader ? this.readerIndex() : (this.readerIndex() + 1) % total;
    this.readerIndex.set(nextReader);
    this.currentPlayerIndex.set((nextReader + 1) % total);
  }

  addPlayer(): void {
    const current = this.players();
    if (current.length >= 8) return;
    const nextId = Math.max(0, ...current.map((p) => p.id)) + 1;
    const defaultPrefix = this.isEn() ? 'Player' : 'Spieler';
    const name = this.newPlayerName().trim() || `${defaultPrefix} ${current.length + 1}`;
    const color = PLAYER_COLORS[(nextId - 1) % PLAYER_COLORS.length];
    this.players.set([
      ...current,
      { id: nextId, name, color, cardsWon: [], eliminatedInRound: false },
    ]);
    this.newPlayerName.set('');
    savePlayerNames(this.players().map((p) => p.name));
  }

  removePlayer(id: number): void {
    if (this.players().length <= 2) return;
    this.players.update((list) => list.filter((p) => p.id !== id));
    savePlayerNames(this.players().map((p) => p.name));
    this.prepareNewRound(true);
  }

  updatePlayerName(id: number, name: string): void {
    this.players.update((list) =>
      list.map((p) => (p.id === id ? { ...p, name } : p))
    );
    savePlayerNames(this.players().map((p) => p.name));
  }

  resetMatch(): void {
    this.players.update((list) =>
      list.map((p) => ({ ...p, cardsWon: [], eliminatedInRound: false }))
    );
    this.prepareNewRound(true);
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyboard(e: KeyboardEvent): void {
    const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
    if (tag === 'input' || tag === 'textarea') return;

    if (e.code === 'Space') {
      e.preventDefault();
      this.hitRedCenterButton();
      return;
    }

    const key = e.key.toUpperCase();
    if (this.letters.includes(key)) {
      e.preventDefault();
      this.pressLetter(key);
    }
  }

  private getAudioContext(): AudioContext | null {
    if (!this.powerOn()) return null;
    if (!this.audioCtx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) this.audioCtx = new AudioCtx();
    }
    return this.audioCtx;
  }

  private playTone(freq: number, duration: number, type: OscillatorType = 'sine'): void {
    const ctx = this.getAudioContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {}
  }

  private playBuzzerSound(): void {
    this.playTone(150, 0.45, 'sawtooth');
    setTimeout(() => this.playTone(115, 0.5, 'sawtooth'), 120);
  }

  private playWinFanfare(): void {
    this.playTone(523.25, 0.12, 'triangle');
    setTimeout(() => this.playTone(659.25, 0.12, 'triangle'), 120);
    setTimeout(() => this.playTone(783.99, 0.22, 'triangle'), 240);
  }
}
