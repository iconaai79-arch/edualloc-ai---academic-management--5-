// Comprehensive Kenyan Counties, Constituencies/Sub-Counties and Wards Dataset

export interface KenyaAdministrativeUnit {
    countyCode: number;
    countyName: string;
    subCounties: string[];
    constituencies: {
        name: string;
        wards: string[];
    }[];
}

export const KENYA_ADMIN_DATA: Record<string, KenyaAdministrativeUnit> = {
    "Nairobi": {
        countyCode: 47,
        countyName: "Nairobi",
        subCounties: [
            "Westlands", "Dagoretti North", "Dagoretti South", "Lang'ata", "Kibra",
            "Roysambu", "Kasarani", "Ruaraka", "Embakasi South", "Embakasi North",
            "Embakasi Central", "Embakasi East", "Embakasi West", "Makadara",
            "Kamukunji", "Starehe", "Mathare"
        ],
        constituencies: [
            {
                name: "Westlands",
                wards: ["Kitisuru", "Parklands/Highridge", "Karura", "Kangemi", "Mountain View"]
            },
            {
                name: "Dagoretti North",
                wards: ["Kilimani", "Kawangware", "Gatina", "Kileleshwa", "Kabiro"]
            },
            {
                name: "Dagoretti South",
                wards: ["Mutu-ini", "Ngando", "Riruta", "Uthiru/Ruthimitu", "Waithaka"]
            },
            {
                name: "Lang'ata",
                wards: ["Karen", "Nairobi West", "Mugumo-ini", "South C", "Nyayo Highrise"]
            },
            {
                name: "Kibra",
                wards: ["Laini Saba", "Lindi", "Makina", "Woodley/Kenyatta Golf Course", "Sarang'ombe"]
            },
            {
                name: "Roysambu",
                wards: ["Githurai", "Kahawa West", "Zimmerman", "Roysambu", "Kahawa"]
            },
            {
                name: "Kasarani",
                wards: ["Clay City", "Mwiki", "Kasarani", "Njiru", "Ruai"]
            },
            {
                name: "Ruaraka",
                wards: ["Babadogo", "Utalii", "Mathare North", "Lucky Summer", "Korogocho"]
            },
            {
                name: "Embakasi South",
                wards: ["Imara Daima", "Kwa Njenga", "Kwa Reuben", "Pipeline", "Kware"]
            },
            {
                name: "Embakasi North",
                wards: ["Kariobangi North", "Dandora Area I", "Dandora Area II", "Dandora Area III", "Dandora Area IV"]
            },
            {
                name: "Embakasi Central",
                wards: ["Kayole North", "Kayole Central", "Kayole South", "Komarock", "Matopeni/Spring Valley"]
            },
            {
                name: "Embakasi East",
                wards: ["Upper Savanna", "Lower Savanna", "Embakasi", "Utawala", "Mihango"]
            },
            {
                name: "Embakasi West",
                wards: ["Umoja I", "Umoja II", "Mowlem", "Kariobangi South"]
            },
            {
                name: "Makadara",
                wards: ["Maringo/Hamza", "Viwandani", "Harambee", "Makongeni"]
            },
            {
                name: "Kamukunji",
                wards: ["Pumwani", "Eastleigh North", "Eastleigh South", "Airbase", "California"]
            },
            {
                name: "Starehe",
                wards: ["Nairobi Central", "Ngara", "Pangani", "Ziwani/Kariokor", "Landi Mawe", "Nairobi South"]
            },
            {
                name: "Mathare",
                wards: ["Hospital", "Mabatini", "Huruma", "Ngei", "Mlango Kubwa", "Kiamaiko"]
            }
        ]
    },
    "Kiambu": {
        countyCode: 22,
        countyName: "Kiambu",
        subCounties: [
            "Kiambu Town", "Ruiru", "Thika Town", "Juja", "Githunguri", "Kabete",
            "Kikuyu", "Limuru", "Lari", "Gatundu South", "Gatundu North", "Kiambaa"
        ],
        constituencies: [
            {
                name: "Kiambu Town",
                wards: ["Ting'ang'a", "Ndumberi", "Riabai", "Township"]
            },
            {
                name: "Ruiru",
                wards: ["Gitothua", "Biashara", "Gatongora", "Kahawa Sukari", "Kahawa Wendani", "Kiuu", "Mwiki", "Mwihoko"]
            },
            {
                name: "Thika Town",
                wards: ["Township", "Kamenu", "Hospital", "Gatuanyaga", "Ngoliba"]
            },
            {
                name: "Juja",
                wards: ["Murera", "Theta", "Juja", "Witeithie", "Kalimoni"]
            },
            {
                name: "Githunguri",
                wards: ["Githunguri", "Githiga", "Ikinu", "Ngewa", "Komothai"]
            },
            {
                name: "Kabete",
                wards: ["Gitaru", "Muguga", "Nyadhuna", "Kabete", "Uthiru"]
            },
            {
                name: "Kikuyu",
                wards: ["Karai", "Nachu", "Sigona", "Kikuyu", "Kinoo"]
            },
            {
                name: "Limuru",
                wards: ["Bibirioni", "Limuru Central", "Ndeiya", "Limuru East", "Ngecha Tigoni"]
            },
            {
                name: "Lari",
                wards: ["Kinale", "Kijabe", "Nyanduma", "Kamburu", "Lari/Kirenga"]
            },
            {
                name: "Gatundu South",
                wards: ["Kiamwangi", "Kiganjo", "Ndangari", "Ngenda"]
            },
            {
                name: "Gatundu North",
                wards: ["Gituamba", "Githobokoni", "Chania", "Mang'u"]
            },
            {
                name: "Kiambaa",
                wards: ["Cianda", "Karuri", "Ndenderu", "Muchatha", "Kihara", "Ndonyo Ngaria"]
            }
        ]
    },
    "Nakuru": {
        countyCode: 32,
        countyName: "Nakuru",
        subCounties: [
            "Nakuru Town East", "Nakuru Town West", "Naivasha", "Gilgil", "Kuresoi North",
            "Kuresoi South", "Molo", "Njoro", "Rongai", "Subukia", "Bahati"
        ],
        constituencies: [
            {
                name: "Nakuru Town East",
                wards: ["Biashara", "Kivumbini", "Flamingo", "Menengai", "Nakuru East"]
            },
            {
                name: "Nakuru Town West",
                wards: ["Barut", "London", "Kaptembwo", "Kapkures", "Rhoda", "Shaabab"]
            },
            {
                name: "Naivasha",
                wards: ["Biashara", "Hells Gate", "Lake View", "Maiella", "Mae Mahiu", "Olkaria", "Naivasha East", "Viwandani"]
            },
            {
                name: "Gilgil",
                wards: ["Gilgil", "Elementaita", "Mbaruk/Eburu", "Malewa West", "Murindat"]
            },
            {
                name: "Molo",
                wards: ["Mariashoni", "Elburgon", "Turi", "Molo"]
            },
            {
                name: "Njoro",
                wards: ["Mau Narok", "Mauche", "Kihingo", "Nesuit", "Lare", "Njoro"]
            },
            {
                name: "Bahati",
                wards: ["Dundori", "Kabatini", "Kiamaina", "Lanet/Umoja", "Bahati"]
            },
            {
                name: "Rongai",
                wards: ["Menengai West", "Soin", "Visoi", "Mosop", "Solai"]
            }
        ]
    },
    "Mombasa": {
        countyCode: 1,
        countyName: "Mombasa",
        subCounties: ["Mvita", "Nyali", "Changamwe", "Jomvu", "Kisauni", "Likoni"],
        constituencies: [
            {
                name: "Mvita",
                wards: ["Mji wa Kale/Makadara", "Tudor", "Tononoka", "Shimanzi/Ganjoni", "Majengo"]
            },
            {
                name: "Nyali",
                wards: ["Frere Town", "Ziwa La Ng'ombe", "Mkomani", "Kongowea", "Kadzandani"]
            },
            {
                name: "Changamwe",
                wards: ["Port Reitz", "Kipevu", "Airport", "Changamwe", "Chaani"]
            },
            {
                name: "Kisauni",
                wards: ["Mjambere", "Junda", "Bamburi", "Mwakirunge", "Mtopanga", "Magogoni", "Shanzu"]
            },
            {
                name: "Likoni",
                wards: ["Mtongwe", "Shika Adabu", "Bofu", "Likoni", "Timbwani"]
            },
            {
                name: "Jomvu",
                wards: ["Jomvu Kuu", "Magongo", "Mikindani"]
            }
        ]
    },
    "Kisumu": {
        countyCode: 42,
        countyName: "Kisumu",
        subCounties: ["Kisumu Central", "Kisumu East", "Kisumu West", "Seme", "Nyando", "Muhoroni", "Nyakach"],
        constituencies: [
            {
                name: "Kisumu Central",
                wards: ["Railways", "Migosi", "Shaurimoyo Kaloleni", "Market Milimani", "Kondele", "Nyalenda B"]
            },
            {
                name: "Kisumu East",
                wards: ["Kajulu", "Kolwa East", "Manyatta B", "Nyalenda A", "Kolwa Central"]
            },
            {
                name: "Kisumu West",
                wards: ["South West Kisumu", "Central Kisumu", "Kisumu North", "West Kisumu", "North West Kisumu"]
            },
            {
                name: "Nyando",
                wards: ["East Kano/Wawidhi", "Awasi/Onjiko", "Ahero", "Kabonyo/Kanyagwal", "Kobura"]
            },
            {
                name: "Seme",
                wards: ["West Seme", "Central Seme", "East Seme", "North Seme"]
            }
        ]
    },
    "Machakos": {
        countyCode: 16,
        countyName: "Machakos",
        subCounties: ["Machakos Town", "Mavoko", "Mwala", "Yatta", "Kangundo", "Matungulu", "Kathiani", "Masinga"],
        constituencies: [
            {
                name: "Machakos Town",
                wards: ["Kalama", "Muputi/Kiima-Kimwe", "Machakos Central", "Mumbuni North", "Muvuti/Kiima-Kimwe", "Kola"]
            },
            {
                name: "Mavoko",
                wards: ["Athi River", "Kinanie", "Muthwani", "Syokimau/Mulolongo"]
            },
            {
                name: "Kangundo",
                wards: ["Kangundo North", "Kangundo Central", "Kangundo East", "Kangundo West"]
            },
            {
                name: "Matungulu",
                wards: ["Tala", "Matungulu North", "Matungulu East", "Matungulu West", "Kyeleni"]
            },
            {
                name: "Kathiani",
                wards: ["Mitaboni", "Kathiani Central", "Upper Kaewa/Iveti", "Lower Kaewa/Kaani"]
            }
        ]
    },
    "Uasin Gishu": {
        countyCode: 27,
        countyName: "Uasin Gishu",
        subCounties: ["Ainabkoi", "Kapseret", "Kesses", "Moiben", "Soy", "Turbo"],
        constituencies: [
            {
                name: "Kapseret",
                wards: ["Simat/Kapseret", "Kipkenyo", "Ngeria", "Megun", "Langas"]
            },
            {
                name: "Turbo",
                wards: ["Ngenyilel", "Tapsagoi", "Kamagut", "Kiplombe", "Kapsaos", "Huruma"]
            },
            {
                name: "Ainabkoi",
                wards: ["Kapsoya", "Kaptagat", "Ainabkoi/Olare"]
            },
            {
                name: "Moiben",
                wards: ["Moiben", "Kimumu", "Karuna/Meibeki", "Sergoit", "Tembelio"]
            },
            {
                name: "Kesses",
                wards: ["Racecourse", "Cheptiret/Kipchamo", "Tulwet/Chuiyat", "Tarakwa"]
            }
        ]
    },
    "Meru": {
        countyCode: 12,
        countyName: "Meru",
        subCounties: ["Imenti North", "Imenti South", "Central Imenti", "Tigania East", "Tigania West", "Igembe Central", "Igembe North", "Igembe South", "Buuri"],
        constituencies: [
            {
                name: "Imenti North",
                wards: ["Municipality", "Ntima East", "Ntima West", "Nyaki West", "Nyaki East"]
            },
            {
                name: "Imenti South",
                wards: ["Mitunguu", "Igoji East", "Igoji West", "Abogeta East", "Abogeta West", "Nkuene"]
            },
            {
                name: "Buuri",
                wards: ["Timau", "Kisima", "Kiirua/Naari", "Ruiri/Rwarera", "Kibirichia"]
            }
        ]
    },
    "Nyeri": {
        countyCode: 19,
        countyName: "Nyeri",
        subCounties: ["Nyeri Town", "Tetu", "Kieni", "Mathira", "Othaya", "Mukurweini"],
        constituencies: [
            {
                name: "Nyeri Town",
                wards: ["Kiganjo/Mathari", "Rware", "Gatitu/Muruguru", "Ruring'u", "Kamakwa/Mukaro"]
            },
            {
                name: "Mathira",
                wards: ["Hugi", "Iriaini", "Konyu", "Kirimukuyu", "Karatina Town", "Magutu"]
            },
            {
                name: "Othaya",
                wards: ["Mahiga", "Iria-Ini", "Chinga", "Karima"]
            },
            {
                name: "Tetu",
                wards: ["Dedan Kimathi", "Wamagana", "Aguthi-Gaaki"]
            }
        ]
    },
    "Murang'a": {
        countyCode: 21,
        countyName: "Murang'a",
        subCounties: ["Kiharu", "Kangema", "Mathioya", "Kigumo", "Kandara", "Gatanga", "Maragwa"],
        constituencies: [
            {
                name: "Kiharu",
                wards: ["Wangu", "Mugoiri", "Mbiri", "Township", "Murarandia", "Gaturi"]
            },
            {
                name: "Kigumo",
                wards: ["Kahumbu", "Muthithi", "Kigumo", "Kangari", "Kinyona"]
            },
            {
                name: "Kandara",
                wards: ["Ng'araria", "Muruka", "Kagundu-Ini", "Gaichanjiru", "Ithiru", "Ruchu"]
            },
            {
                name: "Gatanga",
                wards: ["Ithanga", "Kakuzi/Mitubiri", "Mugumo-Ini", "Kihumbu-Ini", "Gatanga", "Kariara"]
            }
        ]
    }
};

/**
 * Standard list of all 47 Kenyan Counties
 */
export const ALL_KENYA_COUNTIES = [
    "Mombasa", "Kwale", "Kilifi", "Tana River", "Lamu", "Taita Taveta",
    "Garissa", "Wajir", "Mandera", "Marsabit", "Isiolo", "Meru",
    "Tharaka-Nithi", "Embu", "Kitui", "Machakos", "Makueni", "Nyandarua",
    "Nyeri", "Kirinyaga", "Murang'a", "Kiambu", "Turkana", "West Pokot",
    "Samburu", "Trans Nzoia", "Uasin Gishu", "Elgeyo Marakwet", "Nandi",
    "Baringo", "Laikipia", "Nakuru", "Narok", "Kajiado", "Kericho",
    "Bomet", "Kakamega", "Vihiga", "Bungoma", "Busia", "Siaya",
    "Kisumu", "Homa Bay", "Migori", "Kisii", "Nyamira", "Nairobi"
];

/**
 * Resolves all available Sub-Counties for a given County name.
 */
export function getSubCountiesForCounty(countyName?: string, dynamicSubCounties: string[] = []): string[] {
    if (!countyName) return Array.from(new Set(dynamicSubCounties));
    
    // Normalize county search
    const clean = countyName.trim().toLowerCase();
    const matchedKey = Object.keys(KENYA_ADMIN_DATA).find(k => k.toLowerCase() === clean || clean.includes(k.toLowerCase()) || k.toLowerCase().includes(clean));
    
    const staticList = matchedKey ? KENYA_ADMIN_DATA[matchedKey].subCounties : [];
    const combined = Array.from(new Set([...staticList, ...dynamicSubCounties])).filter(Boolean).sort();
    return combined.length > 0 ? combined : dynamicSubCounties;
}

/**
 * Resolves all Constituencies for a given County name.
 */
export function getConstituenciesForCounty(countyName?: string, dynamicConstituencies: string[] = []): string[] {
    if (!countyName) return Array.from(new Set(dynamicConstituencies));
    
    const clean = countyName.trim().toLowerCase();
    const matchedKey = Object.keys(KENYA_ADMIN_DATA).find(k => k.toLowerCase() === clean || clean.includes(k.toLowerCase()) || k.toLowerCase().includes(clean));
    
    const staticList = matchedKey ? KENYA_ADMIN_DATA[matchedKey].constituencies.map(c => c.name) : [];
    const combined = Array.from(new Set([...staticList, ...dynamicConstituencies])).filter(Boolean).sort();
    return combined.length > 0 ? combined : dynamicConstituencies;
}

/**
 * Resolves all Wards for a given County & Constituency name.
 */
export function getWardsForConstituency(countyName?: string, constituencyName?: string, dynamicWards: string[] = []): string[] {
    if (!constituencyName && !countyName) return Array.from(new Set(dynamicWards));
    
    let staticWards: string[] = [];
    
    if (countyName) {
        const cleanCounty = countyName.trim().toLowerCase();
        const matchedKey = Object.keys(KENYA_ADMIN_DATA).find(k => k.toLowerCase() === cleanCounty || cleanCounty.includes(k.toLowerCase()) || k.toLowerCase().includes(cleanCounty));
        if (matchedKey) {
            const countyObj = KENYA_ADMIN_DATA[matchedKey];
            if (constituencyName) {
                const cleanConst = constituencyName.trim().toLowerCase();
                const matchedConst = countyObj.constituencies.find(c => c.name.toLowerCase() === cleanConst || cleanConst.includes(c.name.toLowerCase()));
                if (matchedConst) {
                    staticWards = matchedConst.wards;
                }
            } else {
                // Return all wards in county
                staticWards = countyObj.constituencies.flatMap(c => c.wards);
            }
        }
    }
    
    const combined = Array.from(new Set([...staticWards, ...dynamicWards])).filter(Boolean).sort();
    return combined;
}
