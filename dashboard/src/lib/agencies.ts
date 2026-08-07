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
        name: "Bus S26: Valasaravakkam to Ashok Pillar",
        origin: "Valasaravakkam",
        destination: "Ashok Pillar",
        fare: 15,
        totalStops: 6,
        durationMin: 20,
        coords: [
          { id: "S1", name: "Valasaravakkam", lat: 13.0400, lon: 80.1740 },
          { id: "S2", name: "Alwarthirunagar", lat: 13.0420, lon: 80.1800 },
          { id: "S3", name: "Kesavardhini", lat: 13.0430, lon: 80.1850 },
          { id: "S4", name: "SRM University / Ramapuram", lat: 13.0330, lon: 80.1800 },
          { id: "S5", name: "KK Nagar Depot", lat: 13.0380, lon: 80.1980 },
          { id: "S6", name: "Ashok Pillar", lat: 13.0355, lon: 80.2110 },
        ]
      },
      {
        id: "mtc-21g",
        code: "21G",
        name: "Bus 21G: Tambaram to Broadway",
        origin: "Tambaram Sanatorium",
        destination: "Broadway Bus Terminus",
        fare: 30,
        totalStops: 8,
        durationMin: 35,
        coords: [
          { id: "S1", name: "Tambaram Sanatorium", lat: 12.9279, lon: 80.1214 },
          { id: "S2", name: "Chromepet", lat: 12.9516, lon: 80.1462 },
          { id: "S3", name: "Guindy Kathipara", lat: 13.0067, lon: 80.2020 },
          { id: "S4", name: "Saidapet", lat: 13.0213, lon: 80.2231 },
          { id: "S5", name: "T. Nagar Bus Stand", lat: 13.0418, lon: 80.2341 },
          { id: "S6", name: "MGR Central", lat: 13.0827, lon: 80.2707 },
          { id: "S7", name: "High Court / RGGGH", lat: 13.0864, lon: 80.2870 },
          { id: "S8", name: "Broadway Terminus", lat: 13.0891, lon: 80.2854 }
        ]
      },
      {
        id: "mtc-570",
        code: "570",
        name: "Bus 570: Koyambedu to Siruseri IT Park",
        origin: "Koyambedu CMBT",
        destination: "Siruseri SIPCOT",
        fare: 40,
        totalStops: 6,
        durationMin: 50,
        coords: [
          { id: "S1", name: "CMBT Koyambedu", lat: 13.0694, lon: 80.1948 },
          { id: "S2", name: "Vadapalani", lat: 13.0500, lon: 80.2120 },
          { id: "S3", name: "Guindy Kathipara", lat: 13.0067, lon: 80.2020 },
          { id: "S4", name: "Velachery Railway", lat: 12.9781, lon: 80.2198 },
          { id: "S5", name: "Perungudi OMR", lat: 12.9650, lon: 80.2450 },
          { id: "S6", name: "Siruseri IT Park", lat: 12.8284, lon: 80.2185 }
        ]
      },
      {
        id: "101",
        code: "101",
        name: "Bus 101: Thiruvottiyur to Koyambedu CMBT",
        origin: "Thiruvottiyur B.T.",
        destination: "CMBT Koyambedu",
        fare: 25,
        totalStops: 6,
        durationMin: 35,
        coords: [
          { id: "S1", name: "Thiruvottiyur B.T.", lat: 13.1610, lon: 80.3010 },
          { id: "S2", name: "Royapuram", lat: 13.1050, lon: 80.2910 },
          { id: "S3", name: "Parrys / High Court", lat: 13.0864, lon: 80.2870 },
          { id: "S4", name: "MGR Central", lat: 13.0827, lon: 80.2707 },
          { id: "S5", name: "Aminjikarai", lat: 13.0740, lon: 80.2180 },
          { id: "S6", name: "CMBT Koyambedu", lat: 13.0694, lon: 80.1948 }
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
