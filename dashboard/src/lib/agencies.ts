export interface TransitAgency {
  id: string;
  name: string;
  shortName: string;
  city: string;
  state: string;
  logo: string;
  accentColor: string;
  providerType: "Chalo Network" | "Delhi Open Transit Data" | "CUMTA Chennai One" | "Namma BMTC" | "KSRTC Swift";
  dataStatus: "Open Real-time Feed" | "Chalo Chained Feed" | "GTFS Static + Kalman";
  routes: Array<{
    id: string;
    code: string;
    name: string;
    origin: string;
    destination: string;
    fare: number;
    totalStops: number;
    durationMin: number;
    coords: Array<{ id: string; name: string; lat: number; lon: number }>;
  }>;
}

export const AGENCY_PRESETS: TransitAgency[] = [
  {
    id: "mtc-chennai",
    name: "Metropolitan Transport Corp Chennai",
    shortName: "MTC Chennai",
    city: "Chennai",
    state: "Tamil Nadu",
    logo: "🚍",
    accentColor: "#2563eb",
    providerType: "CUMTA Chennai One",
    dataStatus: "GTFS Static + Kalman",
    routes: [
      {
        id: "S26",
        code: "S26",
        name: "Bus S26: Ashok Pillar to Valasaravakkam",
        origin: "Ashok Pillar",
        destination: "Valasaravakkam",
        fare: 15,
        totalStops: 19,
        durationMin: 26,
        coords: [
          { id: "S1", name: "Ashok Pillar", lat: 13.03514, lon: 80.21089 },
          { id: "S2", name: "Ashok Pillar (Jaffarkhanpet)", lat: 13.03354, lon: 80.21209 },
          { id: "S3", name: "KK Nagar Telephone Exchange", lat: 13.03165, lon: 80.20930 },
          { id: "S4", name: "Bharathidasan Colony", lat: 13.03267, lon: 80.20532 },
          { id: "S5", name: "Kailankadai", lat: 13.03294, lon: 80.20302 },
          { id: "S6", name: "Indra Colony", lat: 13.03142, lon: 80.20248 },
          { id: "S7", name: "Saravana Electrical", lat: 13.03157, lon: 80.19923 },
          { id: "S8", name: "Anjali Mahal", lat: 13.03100, lon: 80.19660 },
          { id: "S9", name: "Anbu Wine Shop", lat: 13.03110, lon: 80.19499 },
          { id: "S10", name: "Sullaipallam", lat: 13.03135, lon: 80.19170 },
          { id: "S11", name: "Nesapakkam MGR Statue", lat: 13.03152, lon: 80.19123 },
          { id: "S12", name: "Nellai Stores", lat: 13.03163, lon: 80.18755 },
          { id: "S13", name: "Balaji Hospital", lat: 13.03167, lon: 80.18675 },
          { id: "S14", name: "Ramapuram Ashram", lat: 13.03175, lon: 80.18395 },
          { id: "S15", name: "SRM University / Ramapuram", lat: 13.03172, lon: 80.17865 },
          { id: "S16", name: "Ramapuram Main Road", lat: 13.03294, lon: 80.17584 },
          { id: "S17", name: "Ambedkar Salai - Ramapuram", lat: 13.03611, lon: 80.17505 },
          { id: "S18", name: "Venkatesawar Nagar", lat: 13.03982, lon: 80.17445 },
          { id: "S19", name: "Valasaravakkam", lat: 13.04104, lon: 80.17370 },
        ]
      },
      {
        id: "mtc-21g",
        code: "21G",
        name: "Bus 21G: Alandur to Kilambakkam",
        origin: "Alandur Court",
        destination: "Kilambakkam Bus Terminus",
        fare: 30,
        totalStops: 15,
        durationMin: 45,
        coords: [
          { id: "S1", name: "Alandur Court", lat: 12.99770, lon: 80.19281 },
          { id: "S2", name: "Meenambakkam Airport", lat: 12.98689, lon: 80.17564 },
          { id: "S3", name: "Thirusoolam Airport", lat: 12.97937, lon: 80.16226 },
          { id: "S4", name: "Pallavaram English Electric", lat: 12.97328, lon: 80.15321 },
          { id: "S5", name: "Pallavaram", lat: 12.96894, lon: 80.14995 },
          { id: "S6", name: "Saravana Store Chromepet", lat: 12.95656, lon: 80.14346 },
          { id: "S7", name: "Chromepet", lat: 12.95166, lon: 80.14043 },
          { id: "S8", name: "Tambaram TB Hospital", lat: 12.94410, lon: 80.13471 },
          { id: "S9", name: "Tambaram Sanatorium B.T", lat: 12.93707, lon: 80.12809 },
          { id: "S10", name: "Tambaram Railway Station", lat: 12.92546, lon: 80.11695 },
          { id: "S11", name: "Irumbuliyur", lat: 12.91664, lon: 80.10667 },
          { id: "S12", name: "Perungalathur", lat: 12.90556, lon: 80.09607 },
          { id: "S13", name: "Perungalathur Sriram Gate", lat: 12.90095, lon: 80.09231 },
          { id: "S14", name: "Iraniyamman Temple", lat: 12.89743, lon: 80.08970 },
          { id: "S15", name: "Kilambakkam Bus Terminus", lat: 12.87351, lon: 80.07858 },
        ]
      },
      {
        id: "mtc-570",
        code: "570",
        name: "Bus 570: KK Nagar to Retteri",
        origin: "KK Nagar Exchange",
        destination: "Retteri Junction",
        fare: 40,
        totalStops: 18,
        durationMin: 50,
        coords: [
          { id: "S1", name: "KK Nagar Telephone Exchange", lat: 13.03165, lon: 80.20930 },
          { id: "S2", name: "Ashok Pillar", lat: 13.03514, lon: 80.21089 },
          { id: "S3", name: "Vadapalani", lat: 13.04703, lon: 80.21218 },
          { id: "S4", name: "Vadapalani Thiru Nagar", lat: 13.05742, lon: 80.21130 },
          { id: "S5", name: "MMDA Colony Road Junction", lat: 13.06514, lon: 80.21101 },
          { id: "S6", name: "M.G.R. Koyambedu Terminus", lat: 13.06880, lon: 80.20520 },
          { id: "S7", name: "Koyambedu Chathiram", lat: 13.07403, lon: 80.19987 },
          { id: "S8", name: "VR Mall", lat: 13.08222, lon: 80.19839 },
          { id: "S9", name: "Thirumangalam", lat: 13.09094, lon: 80.19854 },
          { id: "S10", name: "Anna Nagar West Depot", lat: 13.09370, lon: 80.19842 },
          { id: "S11", name: "Kovarthanagiri", lat: 13.09850, lon: 80.19696 },
          { id: "S12", name: "Wheels India Junction", lat: 13.10144, lon: 80.19432 },
          { id: "S13", name: "Thathan Kuppam", lat: 13.11938, lon: 80.19857 },
          { id: "S14", name: "Senthil Nagar", lat: 13.12365, lon: 80.20203 },
          { id: "S15", name: "Ambedkar Nagar", lat: 13.12645, lon: 80.20699 },
          { id: "S16", name: "Mallikai Avenue Nagar", lat: 13.12837, lon: 80.21030 },
          { id: "S17", name: "Retteri Junction", lat: 13.13000, lon: 80.21317 },
          { id: "S18", name: "Kolathur Shastri Nagar", lat: 13.13615, lon: 80.21634 },
        ]
      },
      {
        id: "101",
        code: "101",
        name: "Bus 101: Thiruvottiyur to Koyambedu",
        origin: "Thiruvottriyur Bus Terminus",
        destination: "M.G.R. Koyambedu Terminus",
        fare: 25,
        totalStops: 21,
        durationMin: 40,
        coords: [
          { id: "S1", name: "Thiruvottriyur Bus Terminus", lat: 13.17523, lon: 80.30610 },
          { id: "S2", name: "Thiruvottiyur Ajax Depot", lat: 13.17219, lon: 80.30545 },
          { id: "S3", name: "Vellayan Chettiyar School", lat: 13.16845, lon: 80.30445 },
          { id: "S4", name: "Thiruvottiyur Market", lat: 13.16438, lon: 80.30350 },
          { id: "S5", name: "Thiruvotriyur Temple", lat: 13.16200, lon: 80.30300 },
          { id: "S6", name: "Ellaiamman Kovil", lat: 13.15702, lon: 80.30156 },
          { id: "S7", name: "Thiruvottiyur Police Station", lat: 13.15384, lon: 80.30054 },
          { id: "S8", name: "Raja Kaladi", lat: 13.15136, lon: 80.29978 },
          { id: "S9", name: "Thangal", lat: 13.14777, lon: 80.29828 },
          { id: "S10", name: "Tollgate", lat: 13.14456, lon: 80.29681 },
          { id: "S11", name: "Anna Nagar", lat: 13.13985, lon: 80.29879 },
          { id: "S12", name: "Nagara Thottam", lat: 13.13198, lon: 80.29658 },
          { id: "S13", name: "Kasimedu", lat: 13.12436, lon: 80.29450 },
          { id: "S14", name: "Kalmandapam Station", lat: 13.11512, lon: 80.29264 },
          { id: "S15", name: "Royapuram Market", lat: 13.10906, lon: 80.29178 },
          { id: "S16", name: "Royapuram Station", lat: 13.10552, lon: 80.29478 },
          { id: "S17", name: "Clive Battery", lat: 13.09931, lon: 80.29398 },
          { id: "S18", name: "Beach Station", lat: 13.09407, lon: 80.29228 },
          { id: "S19", name: "Parrys Corner", lat: 13.08960, lon: 80.29078 },
          { id: "S20", name: "High Court", lat: 13.08528, lon: 80.28445 },
          { id: "S21", name: "M.G.R. Koyambedu Terminus", lat: 13.06880, lon: 80.20520 },
        ]
      },
      {
        id: "26G R",
        code: "26G R",
        name: "Bus 26G R: CMBT to Ramapuram / SRM University",
        origin: "CMBT Koyambedu",
        destination: "SRM University / Ramapuram",
        fare: 20,
        totalStops: 6,
        durationMin: 25,
        coords: [
          { id: "S1", name: "CMBT Koyambedu", lat: 13.0694, lon: 80.1948 },
          { id: "S2", name: "Vadapalani Matrix", lat: 13.0500, lon: 80.2120 },
          { id: "S3", name: "Ashok Pillar", lat: 13.0355, lon: 80.2110 },
          { id: "S4", name: "KK Nagar Depot", lat: 13.0380, lon: 80.1980 },
          { id: "S5", name: "SRM University / Ramapuram", lat: 13.0330, lon: 80.1800 },
          { id: "S6", name: "Ramapuram Ashram", lat: 13.0350, lon: 80.1820 }
        ]
      },
      {
        id: "S86",
        code: "S86",
        name: "Bus S86: Porur to Guindy Metro",
        origin: "Porur Junction",
        destination: "Guindy Metro Station",
        fare: 15,
        totalStops: 5,
        durationMin: 20,
        coords: [
          { id: "S1", name: "Porur Junction", lat: 13.0350, lon: 80.1580 },
          { id: "S2", name: "DLF IT Park", lat: 13.0280, lon: 80.1690 },
          { id: "S3", name: "L N P Kovil Ramapuram", lat: 13.0310, lon: 80.1810 },
          { id: "S4", name: "SRM University", lat: 13.0330, lon: 80.1800 },
          { id: "S5", name: "Guindy Metro Station", lat: 13.0067, lon: 80.2020 }
        ]
      },
      {
        id: "70CCT R",
        code: "70CCT R",
        name: "Bus 70CCT R: CMBT to Kilambakkam KCBT",
        origin: "CMBT Koyambedu",
        destination: "Kilambakkam KCBT Terminus",
        fare: 45,
        totalStops: 7,
        durationMin: 55,
        coords: [
          { id: "S1", name: "CMBT Koyambedu", lat: 13.0694, lon: 80.1948 },
          { id: "S2", name: "Vadapalani", lat: 13.0500, lon: 80.2120 },
          { id: "S3", name: "Ashok Pillar", lat: 13.0355, lon: 80.2110 },
          { id: "S4", name: "Guindy Kathipara", lat: 13.0067, lon: 80.2020 },
          { id: "S5", name: "Chromepet", lat: 12.9516, lon: 80.1462 },
          { id: "S6", name: "Tambaram Sanatorium", lat: 12.9279, lon: 80.1214 },
          { id: "S7", name: "Kilambakkam KCBT Terminus", lat: 12.8350, lon: 80.0510 }
        ]
      }
    ]
  },
  {
    id: "bmtc",
    name: "Bengaluru Metropolitan Transport Corp",
    shortName: "BMTC",
    city: "Bengaluru",
    state: "Karnataka",
    logo: "🚌",
    accentColor: "#0284c7",
    providerType: "Namma BMTC",
    dataStatus: "GTFS Static + Kalman",
    routes: [
      {
        id: "bmtc-101",
        code: "101",
        name: "Bus 101: Majestic to Station B",
        origin: "Majestic BS",
        destination: "Indiranagar Station B",
        fare: 35,
        totalStops: 6,
        durationMin: 25,
        coords: [
          { id: "S1", name: "Majestic Kempegowda BS", lat: 12.9716, lon: 77.5946 },
          { id: "S2", name: "Corporation Circle", lat: 12.9740, lon: 77.5970 },
          { id: "S3", name: "Residency Road", lat: 12.9760, lon: 77.5990 },
          { id: "S4", name: "MG Road Metro", lat: 12.9780, lon: 77.6010 },
          { id: "S5", name: "Halasuru", lat: 12.9800, lon: 77.6030 },
          { id: "S6", name: "Indiranagar Depot", lat: 12.9820, lon: 77.6050 }
        ]
      },
      {
        id: "bmtc-500d",
        code: "500D",
        name: "Route 500D: Hebbal to Silk Board",
        origin: "Hebbal Flyover",
        destination: "Silk Board Junction",
        fare: 45,
        totalStops: 5,
        durationMin: 40,
        coords: [
          { id: "S1", name: "Hebbal", lat: 13.0358, lon: 77.5970 },
          { id: "S2", name: "Manyata Tech Park", lat: 13.0450, lon: 77.6200 },
          { id: "S3", name: "Tin Factory", lat: 12.9980, lon: 77.6680 },
          { id: "S4", name: "Marathahalli", lat: 12.9560, lon: 77.7010 },
          { id: "S5", name: "Silk Board", lat: 12.9170, lon: 77.6230 }
        ]
      }
    ]
  },
  {
    id: "best-mumbai",
    name: "BEST Undertaking Mumbai",
    shortName: "BEST Mumbai",
    city: "Mumbai",
    state: "Maharashtra",
    logo: "🚌",
    accentColor: "#dc2626",
    providerType: "Chalo Network",
    dataStatus: "Chalo Chained Feed",
    routes: [
      {
        id: "best-a115",
        code: "A-115",
        name: "Route A-115: CSMT to Marine Drive",
        origin: "CSMT Railway Station",
        destination: "Marine Drive Nariman Pt",
        fare: 15,
        totalStops: 4,
        durationMin: 18,
        coords: [
          { id: "S1", name: "CSMT Station", lat: 18.9400, lon: 72.8353 },
          { id: "S2", name: "Churchgate", lat: 18.9348, lon: 72.8277 },
          { id: "S3", name: "Marine Drive", lat: 18.9430, lon: 72.8230 },
          { id: "S4", name: "Nariman Point", lat: 18.9260, lon: 72.8220 }
        ]
      },
      {
        id: "best-332",
        code: "332",
        name: "Route 332: Kurla Station to BKC",
        origin: "Kurla West Station",
        destination: "BKC Diamond Bourse",
        fare: 20,
        totalStops: 4,
        durationMin: 22,
        coords: [
          { id: "S1", name: "Kurla West", lat: 19.0650, lon: 72.8790 },
          { id: "S2", name: "BKC Connector", lat: 19.0600, lon: 72.8680 },
          { id: "S3", name: "NSE Grounds BKC", lat: 19.0630, lon: 72.8620 },
          { id: "S4", name: "Bharat Diamond Bourse", lat: 19.0670, lon: 72.8590 }
        ]
      }
    ]
  },
  {
    id: "dtc-delhi",
    name: "Delhi Transport Corp (DTC)",
    shortName: "DTC Delhi",
    city: "New Delhi",
    state: "Delhi NCR",
    logo: "🚏",
    accentColor: "#16a34a",
    providerType: "Delhi Open Transit Data",
    dataStatus: "Open Real-time Feed",
    routes: [
      {
        id: "dtc-534",
        code: "534",
        name: "Route 534: Anand Vihar to Nehru Place",
        origin: "Anand Vihar ISBT",
        destination: "Nehru Place Bus Terminal",
        fare: 25,
        totalStops: 5,
        durationMin: 45,
        coords: [
          { id: "S1", name: "Anand Vihar ISBT", lat: 28.6469, lon: 77.3160 },
          { id: "S2", name: "Laxmi Nagar Metro", lat: 28.6304, lon: 77.2772 },
          { id: "S3", name: "ITO Crossing", lat: 28.6289, lon: 77.2415 },
          { id: "S4", name: "AIIMS Bus Stop", lat: 28.5672, lon: 77.2100 },
          { id: "S5", name: "Nehru Place Terminal", lat: 28.5492, lon: 77.2517 }
        ]
      }
    ]
  }
];
