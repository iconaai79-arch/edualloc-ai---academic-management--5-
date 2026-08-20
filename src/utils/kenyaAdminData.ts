// Comprehensive Kenyan Counties, Constituencies/Sub-Counties and Wards Dataset
// Structured according to official IEBC (Independent Electoral and Boundaries Commission) 2022 dataset

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
    "Mombasa": {
        countyCode: 1,
        countyName: "Mombasa",
        subCounties: ["Mvita", "Nyali", "Changamwe", "Jomvu", "Kisauni", "Likoni"],
        constituencies: [
            { name: "Mvita", wards: ["Mji wa Kale/Makadara", "Tudor", "Tononoka", "Shimanzi/Ganjoni", "Majengo"] },
            { name: "Nyali", wards: ["Frere Town", "Ziwa La Ng'ombe", "Mkomani", "Kongowea", "Kadzandani"] },
            { name: "Changamwe", wards: ["Port Reitz", "Kipevu", "Airport", "Changamwe", "Chaani"] },
            { name: "Jomvu", wards: ["Jomvu Kuu", "Magongo", "Mikindani"] },
            { name: "Kisauni", wards: ["Mjambere", "Junda", "Bamburi", "Mwakirunge", "Mtopanga", "Magogoni", "Shanzu"] },
            { name: "Likoni", wards: ["Mtongwe", "Shika Adabu", "Bofu", "Likoni", "Timbwani"] }
        ]
    },
    "Kwale": {
        countyCode: 2,
        countyName: "Kwale",
        subCounties: ["Msambweni", "Lunga Lunga", "Matuga", "Kinango"],
        constituencies: [
            { name: "Msambweni", wards: ["Gombato Bongwe", "Ukunda", "Kinondo", "Ramisi"] },
            { name: "Lunga Lunga", wards: ["Pongwe/Kikoneni", "Dzombo", "Mwereni", "Vanga"] },
            { name: "Matuga", wards: ["Tsimba Golini", "Waa", "Tiwi", "Kubo South", "Mkongani"] },
            { name: "Kinango", wards: ["Ndavaya", "Puma", "Kinango", "Mackinnon Road", "Chengoni/Samburu", "Mwavumbo", "Kasemeni"] }
        ]
    },
    "Kilifi": {
        countyCode: 3,
        countyName: "Kilifi",
        subCounties: ["Kilifi North", "Kilifi South", "Kaloleni", "Rabai", "Ganze", "Malindi", "Magarini"],
        constituencies: [
            { name: "Kilifi North", wards: ["Tezo", "Sokoni", "Kibarani", "Dabaso", "Matsangoni", "Watamu", "Mnarani"] },
            { name: "Kilifi South", wards: ["Junju", "Mwarakaya", "Shimo la Tewa", "Chasimba", "Mtepeni"] },
            { name: "Kaloleni", wards: ["Mariakani", "Kayafungo", "Kaloleni", "Mwanamwinga"] },
            { name: "Rabai", wards: ["Mwawesa", "Ruruma", "Kambe/Ribe", "Rabai/Kisurutini"] },
            { name: "Ganze", wards: ["Ganze", "Bamba", "Jaribuni", "Sokoke"] },
            { name: "Malindi", wards: ["Jilore", "Kakuyuni", "Ganda", "Malindi Town", "Shella"] },
            { name: "Magarini", wards: ["Marafa", "Magarini", "Gongoni", "Adu", "Garashi", "Sabaki"] }
        ]
    },
    "Tana River": {
        countyCode: 4,
        countyName: "Tana River",
        subCounties: ["Garsen", "Galole", "Bura"],
        constituencies: [
            { name: "Garsen", wards: ["Kipini East", "Garsen South", "Kipini West", "Garsen Central", "Garsen West", "Garsen North"] },
            { name: "Galole", wards: ["Kinakomba", "Mikinduni", "Chewani", "Wayu"] },
            { name: "Bura", wards: ["Chewele", "Hirimani", "Bangale", "Sala", "Madogo"] }
        ]
    },
    "Lamu": {
        countyCode: 5,
        countyName: "Lamu",
        subCounties: ["Lamu East", "Lamu West"],
        constituencies: [
            { name: "Lamu East", wards: ["Faza", "Kiunga", "Basuba"] },
            { name: "Lamu West", wards: ["Shella", "Mkomani", "Hindi", "Mkunumbi", "Hongwe", "Witu", "Bahari"] }
        ]
    },
    "Taita Taveta": {
        countyCode: 6,
        countyName: "Taita Taveta",
        subCounties: ["Taveta", "Wundanyi", "Mwatate", "Voi"],
        constituencies: [
            { name: "Taveta", wards: ["Chala", "Mahoo", "Bomeni", "Mboghoni", "Mata"] },
            { name: "Wundanyi", wards: ["Wundanyi/Mbale", "Werugha", "Wumingu/Kishushe", "Mwanda/Mgange"] },
            { name: "Mwatate", wards: ["Ronge", "Mwatate", "Bura", "Chawia", "Wusi/Kishamba"] },
            { name: "Voi", wards: ["Mbololo", "Sagalla", "Kaloleni", "Marungu", "Kasigau", "Ngolia"] }
        ]
    },
    "Garissa": {
        countyCode: 7,
        countyName: "Garissa",
        subCounties: ["Garissa Township", "Balambala", "Lagdera", "Dadaab", "Fafi", "Ijara"],
        constituencies: [
            { name: "Garissa Township", wards: ["Waberi", "Galbet", "Township", "Iftin"] },
            { name: "Balambala", wards: ["Balambala", "Danyere", "Jara Jara", "Saka", "Sankuri"] },
            { name: "Lagdera", wards: ["Modogashe", "Benane", "Goreale", "Maalamin", "Sabena", "Baraki"] },
            { name: "Dadaab", wards: ["Dertu", "Dadaab", "Labasigale", "Damajale", "Liboi", "Abakaile"] },
            { name: "Fafi", wards: ["Bura", "Dekaharia", "Jarajilla", "Fafi", "Nanighi"] },
            { name: "Ijara", wards: ["Hulugho", "Sangailu", "Ijara", "Masalani"] }
        ]
    },
    "Wajir": {
        countyCode: 8,
        countyName: "Wajir",
        subCounties: ["Wajir North", "Wajir East", "Tarbaj", "Wajir West", "Eldas", "Wajir South"],
        constituencies: [
            { name: "Wajir North", wards: ["Gurar", "Bute", "Korondile", "Malkagufu", "Batalu", "Danaba", "Godoma"] },
            { name: "Wajir East", wards: ["Wagberi", "Township", "Barwago", "Khorof/Harar"] },
            { name: "Tarbaj", wards: ["Elben", "Sarman", "Tarbaj", "Wargadud"] },
            { name: "Wajir West", wards: ["Arbajahan", "Hadado/Athibohol", "Ademasajide", "Ganyure/Wagalla"] },
            { name: "Eldas", wards: ["Eldas", "Elan", "Basir", "Lakoley South"] },
            { name: "Wajir South", wards: ["Benane", "Burder", "Dadajabula", "Habaswein", "Lagboghol South", "Ibrahim Ure", "Diff"] }
        ]
    },
    "Mandera": {
        countyCode: 9,
        countyName: "Mandera",
        subCounties: ["Mandera West", "Banissa", "Mandera North", "Mandera South", "Mandera East", "Lafey"],
        constituencies: [
            { name: "Mandera West", wards: ["Takaba South", "Takaba", "Lagsure", "Dandu", "Gither"] },
            { name: "Banissa", wards: ["Banissa", "Derkhale", "Guba", "Malkamari", "Kiliwehiri"] },
            { name: "Mandera North", wards: ["Ashabito", "Guticha", "Morothile", "Rhamu", "Rhamu Dimtu"] },
            { name: "Mandera South", wards: ["Wargadud", "Kutulo", "Elwak South", "Elwak North", "Shimbir Fatuma"] },
            { name: "Mandera East", wards: ["Arabia", "Bulla Mpya", "Khalalio", "Neboi", "Township"] },
            { name: "Lafey", wards: ["Libehia", "Fino", "Lafey", "Warankara", "Alango"] }
        ]
    },
    "Marsabit": {
        countyCode: 10,
        countyName: "Marsabit",
        subCounties: ["Moyale", "North Horr", "Saku", "Laisamis"],
        constituencies: [
            { name: "Moyale", wards: ["Butiye", "Sololo", "Heilu Manyatta", "Golbo", "Moyale Township", "Uran", "Obbu"] },
            { name: "North Horr", wards: ["Dukana", "Maikona", "Turbi", "North Horr", "Illeret"] },
            { name: "Saku", wards: ["Sagante/Jaldesa", "Karare", "Marsabit Central"] },
            { name: "Laisamis", wards: ["Loiyangalani", "Kargi/South Horr", "Korr/Ngurunit", "Logo Logo", "Laisamis"] }
        ]
    },
    "Isiolo": {
        countyCode: 11,
        countyName: "Isiolo",
        subCounties: ["Isiolo North", "Isiolo South"],
        constituencies: [
            { name: "Isiolo North", wards: ["Wabera", "Bulla Pesa", "Chari", "Cherab", "Ngare Mara", "Burat", "Oldo/Nyiro"] },
            { name: "Isiolo South", wards: ["Garbatulla", "Kinna", "Sericho"] }
        ]
    },
    "Meru": {
        countyCode: 12,
        countyName: "Meru",
        subCounties: ["Igembe South", "Igembe Central", "Igembe North", "Tigania West", "Tigania East", "North Imenti", "Buuri", "Central Imenti", "South Imenti"],
        constituencies: [
            { name: "Igembe South", wards: ["Maua", "Kegoi/Antubochiu", "Athiru Gaiti", "Akachiu", "Kanuni"] },
            { name: "Igembe Central", wards: ["Akirang'ondu", "Athiru Ruujine", "Igembe East", "Njia", "Kangeta"] },
            { name: "Igembe North", wards: ["Antuambui", "Ntunene", "Antubetwe Kiongo", "Naathu", "Amwathi"] },
            { name: "Tigania West", wards: ["Athwana", "Akithi", "Kianjai", "Nkomo", "Mbeu"] },
            { name: "Tigania East", wards: ["Thangatha", "Mikinduri", "Kiguchwa", "Muthara", "Karama"] },
            { name: "North Imenti", wards: ["Municipality", "Ntima East", "Ntima West", "Nyaki West", "Nyaki East"] },
            { name: "Buuri", wards: ["Timau", "Kisima", "Kiirua/Naari", "Ruiri/Rwarera", "Kibirichia"] },
            { name: "Central Imenti", wards: ["Mwanganthia", "Abothuguchi Central", "Abothuguchi West", "Kiagu"] },
            { name: "South Imenti", wards: ["Mitunguu", "Igoji East", "Igoji West", "Abogeta East", "Abogeta West", "Nkuene"] }
        ]
    },
    "Tharaka-Nithi": {
        countyCode: 13,
        countyName: "Tharaka-Nithi",
        subCounties: ["Maara", "Chuka", "Tharaka"],
        constituencies: [
            { name: "Maara", wards: ["Mitheru", "Muthambi", "Mwimbi", "Ganga", "Chogoria"] },
            { name: "Chuka/Igambang'ombe", wards: ["Mariani", "Karingani", "Magumoni", "Mugwe", "Igambang'ombe"] },
            { name: "Tharaka", wards: ["Gatunga", "Mukothima", "Nkondi", "Chiakariga", "Marimanti"] }
        ]
    },
    "Embu": {
        countyCode: 14,
        countyName: "Embu",
        subCounties: ["Manyatta", "Runyenjes", "Mbeere South", "Mbeere North"],
        constituencies: [
            { name: "Manyatta", wards: ["Ruguru/Ngandori", "Kithimu", "Nginda", "Mbeti North", "Kirimari", "Gaturi South"] },
            { name: "Runyenjes", wards: ["Gaturi North", "Kagaari South", "Kagaari North", "Central Ward", "Kyeni North", "Kyeni South"] },
            { name: "Mbeere South", wards: ["Mwea", "Makima", "Mbeti South", "Mavuria", "Kiambere"] },
            { name: "Mbeere North", wards: ["Nthawa", "Muminji", "Evurore"] }
        ]
    },
    "Kitui": {
        countyCode: 15,
        countyName: "Kitui",
        subCounties: ["Mwingi North", "Mwingi West", "Mwingi Central", "Kitui West", "Kitui Rural", "Kitui Central", "Kitui East", "Kitui South"],
        constituencies: [
            { name: "Mwingi North", wards: ["Ngomeni", "Kyuso", "Mumoni", "Tseikuru", "Tharaka"] },
            { name: "Mwingi West", wards: ["Kyome/Thaana", "Nguutani", "Migwani", "Kiomo/Kyethani"] },
            { name: "Mwingi Central", wards: ["Central", "Kivou", "Nguni", "Nuu", "Mui", "Waita"] },
            { name: "Kitui West", wards: ["Mutonguni", "Kauwi", "Matinyani", "Kwa Mutonga/Kithumula"] },
            { name: "Kitui Rural", wards: ["Kisasi", "Mbitini", "Kwavonza/Yatta", "Kanyangi"] },
            { name: "Kitui Central", wards: ["Miambani", "Township", "Kyangwithya West", "Mulango", "Kyangwithya East"] },
            { name: "Kitui East", wards: ["Zombe/Mwitika", "Nzambani", "Chuluni", "Voo/Kyamatu", "Endau/Malalani", "Mutito/Kaliku"] },
            { name: "Kitui South", wards: ["Ikanga/Kyatune", "Mutomo", "Mutha", "Ikutha", "Kanziko", "Athi"] }
        ]
    },
    "Machakos": {
        countyCode: 16,
        countyName: "Machakos",
        subCounties: ["Masinga", "Yatta", "Kangundo", "Matungulu", "Kathiani", "Mavoko", "Machakos Town", "Mwala"],
        constituencies: [
            { name: "Masinga", wards: ["Kivaa", "Masinga Central", "Ekalakala", "Muthesya", "Ndithini"] },
            { name: "Yatta", wards: ["Ndalani", "Matuu", "Kithimani", "Ikombe", "Katangi"] },
            { name: "Kangundo", wards: ["Kangundo North", "Kangundo Central", "Kangundo East", "Kangundo West"] },
            { name: "Matungulu", wards: ["Tala", "Matungulu North", "Matungulu East", "Matungulu West", "Kyeleni"] },
            { name: "Kathiani", wards: ["Mitaboni", "Kathiani Central", "Upper Kaewa/Iveti", "Lower Kaewa/Kaani"] },
            { name: "Mavoko", wards: ["Athi River", "Kinanie", "Muthwani", "Syokimau/Mulolongo"] },
            { name: "Machakos Town", wards: ["Kalama", "Muputi/Kiima-Kimwe", "Machakos Central", "Mumbuni North", "Muvuti/Kiima-Kimwe", "Kola", "Mutituni"] },
            { name: "Mwala", wards: ["Mbiuni", "Makutano/ Mwala", "Masii", "Muthetheni", "Wamunyu", "Kibauni"] }
        ]
    },
    "Makueni": {
        countyCode: 17,
        countyName: "Makueni",
        subCounties: ["Mbooni", "Kilome", "Kaiti", "Makueni", "Kibwezi West", "Kibwezi East"],
        constituencies: [
            { name: "Mbooni", wards: ["Tulimani", "Mbooni", "Kithungo/Kitundu", "Kiteta/Kisau", "Waia-Kako", "Kalawa"] },
            { name: "Kilome", wards: ["Kasikeu", "Mukaa", "Kiima Kiu/Kalanzoni"] },
            { name: "Kaiti", wards: ["Ukia", "Kee", "Kilungu", "Ilima"] },
            { name: "Makueni", wards: ["Wote", "Muvau/Kikumini", "Mavindini", "Kitise/Kithuki", "Kathonzweni", "Nzaui/Kilili/Kalamba", "Mbitini"] },
            { name: "Kibwezi West", wards: ["Makindu", "Nguumo", "Kikumbulyu North", "Kikumbulyu South", "Nguu/Masumba", "Emali/Mulala"] },
            { name: "Kibwezi East", wards: ["Masongaleni", "Mtito Andei", "Thange", "Ivingoni/Nzambani"] }
        ]
    },
    "Nyandarua": {
        countyCode: 18,
        countyName: "Nyandarua",
        subCounties: ["Kinangop", "Kipipiri", "Ol Kalou", "Ol Jorok", "Ndaragwa"],
        constituencies: [
            { name: "Kinangop", wards: ["Engineer", "Gathara", "North Kinangop", "Murungaru", "Njabini/Kiburu", "Nyakio", "Githabai", "Magumu"] },
            { name: "Kipipiri", wards: ["Wanjohi", "Kipipiri", "Geta", "Githioro"] },
            { name: "Ol Kalou", wards: ["Karau", "Kanjuiri Ridge", "Mirangine", "Kaimbaga", "Rurii"] },
            { name: "Ol Jorok", wards: ["Gathanji", "Gatimu", "Weru", "Charagita"] },
            { name: "Ndaragwa", wards: ["Leshau/Pondo", "Kiriita", "Central", "Shamata"] }
        ]
    },
    "Nyeri": {
        countyCode: 19,
        countyName: "Nyeri",
        subCounties: ["Tetu", "Kieni", "Mathira", "Othaya", "Mukurweini", "Nyeri Town"],
        constituencies: [
            { name: "Tetu", wards: ["Dedan Kimathi", "Wamagana", "Aguthi-Gaaki"] },
            { name: "Kieni", wards: ["Mweiga", "Naromoru Kiamathaga", "Mwiyogo/Endarasha", "Mugunda", "Gatarakwa", "Thegu River", "Kabaru", "Gakawa"] },
            { name: "Mathira", wards: ["Hugi", "Iriaini", "Konyu", "Kirimukuyu", "Karatina Town", "Magutu"] },
            { name: "Othaya", wards: ["Mahiga", "Iria-Ini", "Chinga", "Karima"] },
            { name: "Mukurweini", wards: ["Gikondi", "Rugi", "Mukurwe-ini West", "Mukurwe-ini Central"] },
            { name: "Nyeri Town", wards: ["Kiganjo/Mathari", "Rware", "Gatitu/Muruguru", "Ruring'u", "Kamakwa/Mukaro"] }
        ]
    },
    "Kirinyaga": {
        countyCode: 20,
        countyName: "Kirinyaga",
        subCounties: ["Mwea", "Gichugu", "Ndia", "Kirinyaga Central"],
        constituencies: [
            { name: "Mwea", wards: ["Mutithi", "Kangai", "Thiba", "Wamumu", "Nyangati", "Murinduko", "Gathigiriri", "Tebere"] },
            { name: "Gichugu", wards: ["Kabare", "Baragwi", "Njukiini", "Ngariama", "Karumandi"] },
            { name: "Ndia", wards: ["Mukure", "Kiine", "Kariti"] },
            { name: "Kirinyaga Central", wards: ["Mutira", "Kanyekini", "Kerugoya", "Inoi"] }
        ]
    },
    "Murang'a": {
        countyCode: 21,
        countyName: "Murang'a",
        subCounties: ["Kangema", "Mathioya", "Kiharu", "Kigumo", "Maragwa", "Kandara", "Gatanga"],
        constituencies: [
            { name: "Kangema", wards: ["Kanyenya-Ini", "Muguru", "Rwathia"] },
            { name: "Mathioya", wards: ["Gitugi", "Kiru", "Kamacharia"] },
            { name: "Kiharu", wards: ["Wangu", "Mugoiri", "Mbiri", "Township", "Murarandia", "Gaturi"] },
            { name: "Kigumo", wards: ["Kahumbu", "Muthithi", "Kigumo", "Kangari", "Kinyona"] },
            { name: "Maragwa", wards: ["Kimorori/Wempa", "Makuyu", "Kambiti", "Kamahuha", "Ichagaki", "Nginda"] },
            { name: "Kandara", wards: ["Ng'araria", "Muruka", "Kagundu-Ini", "Gaichanjiru", "Ithiru", "Ruchu"] },
            { name: "Gatanga", wards: ["Ithanga", "Kakuzi/Mitubiri", "Mugumo-Ini", "Kihumbu-Ini", "Gatanga", "Kariara"] }
        ]
    },
    "Kiambu": {
        countyCode: 22,
        countyName: "Kiambu",
        subCounties: ["Gatundu South", "Gatundu North", "Juja", "Thika Town", "Ruiru", "Githunguri", "Kiambu Town", "Kiambaa", "Kabete", "Kikuyu", "Limuru", "Lari"],
        constituencies: [
            { name: "Gatundu South", wards: ["Kiamwangi", "Kiganjo", "Ndangari", "Ngenda"] },
            { name: "Gatundu North", wards: ["Gituamba", "Githobokoni", "Chania", "Mang'u"] },
            { name: "Juja", wards: ["Murera", "Theta", "Juja", "Witeithie", "Kalimoni"] },
            { name: "Thika Town", wards: ["Township", "Kamenu", "Hospital", "Gatuanyaga", "Ngoliba"] },
            { name: "Ruiru", wards: ["Gitothua", "Biashara", "Gatongora", "Kahawa Sukari", "Kahawa Wendani", "Kiuu", "Mwiki", "Mwihoko"] },
            { name: "Githunguri", wards: ["Githunguri", "Githiga", "Ikinu", "Ngewa", "Komothai"] },
            { name: "Kiambu Town", wards: ["Ting'ang'a", "Ndumberi", "Riabai", "Township"] },
            { name: "Kiambaa", wards: ["Cianda", "Karuri", "Ndenderu", "Muchatha", "Kihara", "Ndonyo Ngaria"] },
            { name: "Kabete", wards: ["Gitaru", "Muguga", "Nyadhuna", "Kabete", "Uthiru"] },
            { name: "Kikuyu", wards: ["Karai", "Nachu", "Sigona", "Kikuyu", "Kinoo"] },
            { name: "Limuru", wards: ["Bibirioni", "Limuru Central", "Ndeiya", "Limuru East", "Ngecha Tigoni"] },
            { name: "Lari", wards: ["Kinale", "Kijabe", "Nyanduma", "Kamburu", "Lari/Kirenga"] }
        ]
    },
    "Turkana": {
        countyCode: 23,
        countyName: "Turkana",
        subCounties: ["Turkana North", "Turkana West", "Turkana Central", "Loima", "Turkana South", "Turkana East"],
        constituencies: [
            { name: "Turkana North", wards: ["Kaeris", "Lake Zone", "Lapur", "Kaaleng/Kaikor", "Kibish", "Nakalale"] },
            { name: "Turkana West", wards: ["Kakuma", "Lopur", "Letea", "Songot", "Kalobeyei", "Lokichoggio", "Nanaam"] },
            { name: "Turkana Central", wards: ["Kerio Delta", "Kang'atotha", "Kalokol", "Lodwar Township", "Kanamkemer"] },
            { name: "Loima", wards: ["Kotaruk/Lobei", "Turkwel", "Loima", "Lokiriama/Lorengippi"] },
            { name: "Turkana South", wards: ["Kaputir", "Katilu", "Lobokat", "Kalapata", "Lokichar"] },
            { name: "Turkana East", wards: ["Kapedo/Napeitom", "Katilia", "Lokori/Kochodin"] }
        ]
    },
    "West Pokot": {
        countyCode: 24,
        countyName: "West Pokot",
        subCounties: ["Kapenguria", "Sigor", "Kacheliba", "Pokot South"],
        constituencies: [
            { name: "Kapenguria", wards: ["Riwo", "Kapenguria", "Mnagei", "Siyoi", "Endugh", "Sook"] },
            { name: "Sigor", wards: ["Sekerr", "Masool", "Lomut", "Weiwei"] },
            { name: "Kacheliba", wards: ["Suam", "Kodich", "Kasei", "Kapchok", "Kiwawa", "Alale"] },
            { name: "Pokot South", wards: ["Chepareria", "Batei", "Lelan", "Tapach"] }
        ]
    },
    "Samburu": {
        countyCode: 25,
        countyName: "Samburu",
        subCounties: ["Samburu West", "Samburu North", "Samburu East"],
        constituencies: [
            { name: "Samburu West", wards: ["Lodokejek", "Suguta Marmar", "Maralal", "Loosuk", "Poro"] },
            { name: "Samburu North", wards: ["El-Barta", "Nachola", "Ndoto", "Nyiro", "Angata Nanyokie", "Baawa"] },
            { name: "Samburu East", wards: ["Waso", "Wamba West", "Wamba East", "Wamba North"] }
        ]
    },
    "Trans Nzoia": {
        countyCode: 26,
        countyName: "Trans Nzoia",
        subCounties: ["Kwanza", "Endebess", "Saboti", "Kiminini", "Cherangany"],
        constituencies: [
            { name: "Kwanza", wards: ["Kapomboi", "Kwanza", "Keiyo", "Bidii"] },
            { name: "Endebess", wards: ["Chepchoina", "Endebess", "Matumbei"] },
            { name: "Saboti", wards: ["Kinyoro", "Matisi", "Tuwani", "Saboti", "Machewa"] },
            { name: "Kiminini", wards: ["Kiminini", "Waitaluk", "Sirende", "Hospital", "Sikhendu", "Nabiswa"] },
            { name: "Cherangany", wards: ["Sinyerere", "Makutano", "Kaplamai", "Mois Bridge", "Kapsara", "Chepsiro/Kiptoror", "Sitatunga"] }
        ]
    },
    "Uasin Gishu": {
        countyCode: 27,
        countyName: "Uasin Gishu",
        subCounties: ["Soy", "Turbo", "Moiben", "Ainabkoi", "Kapseret", "Kesses"],
        constituencies: [
            { name: "Soy", wards: ["Moi's Bridge", "Kapkures", "Ziwa", "Segero/Barsombe", "Kipsomba", "Soy", "Kuinet/Kapsuswa"] },
            { name: "Turbo", wards: ["Ngenyilel", "Tapsagoi", "Kamagut", "Kiplombe", "Kapsaos", "Huruma"] },
            { name: "Moiben", wards: ["Moiben", "Kimumu", "Karuna/Meibeki", "Sergoit", "Tembelio"] },
            { name: "Ainabkoi", wards: ["Kapsoya", "Kaptagat", "Ainabkoi/Olare"] },
            { name: "Kapseret", wards: ["Simat/Kapseret", "Kipkenyo", "Ngeria", "Megun", "Langas"] },
            { name: "Kesses", wards: ["Racecourse", "Cheptiret/Kipchamo", "Tulwet/Chuiyat", "Tarakwa"] }
        ]
    },
    "Elgeyo-Marakwet": {
        countyCode: 28,
        countyName: "Elgeyo-Marakwet",
        subCounties: ["Marakwet East", "Marakwet West", "Keiyo North", "Keiyo South"],
        constituencies: [
            { name: "Marakwet East", wards: ["Kapyego", "Sambirir", "Endo", "Embobut / Embulot"] },
            { name: "Marakwet West", wards: ["Lelan", "Sengwer", "Cherang'any/Chebororwa", "Moiben/Kuserwo", "Kapsowar", "Arror"] },
            { name: "Keiyo North", wards: ["Emsoo", "Kamariny", "Kapchemutwa", "Tambach"] },
            { name: "Keiyo South", wards: ["Kaptarakwa", "Chepkorio", "Soy North", "Soy South", "Kabiemit", "Metkei"] }
        ]
    },
    "Nandi": {
        countyCode: 29,
        countyName: "Nandi",
        subCounties: ["Tinderet", "Aldai", "Nandi Hills", "Chesumei", "Emgwen", "Mosop"],
        constituencies: [
            { name: "Tinderet", wards: ["Songhor/Soba", "Tindiret", "Chemelil/Chemase", "Kapsimotwo"] },
            { name: "Aldai", wards: ["Kabwareng", "Terik", "Kemeloi-Maraba", "Kobujoi", "Kaptumo-Kaboi", "Koyo-Ndurio"] },
            { name: "Nandi Hills", wards: ["Nandi Hills", "Chepkunyuk", "Ol'lessos", "Kapchorua"] },
            { name: "Chesumei", wards: ["Chemundu/Kapng'etuny", "Kosirai", "Lelmokwo/Ngechek", "Kaptel/Kamoiywo", "Kiptuya"] },
            { name: "Emgwen", wards: ["Chepkumia", "Kapkangani", "Kapsabet", "Kilibwoni"] },
            { name: "Mosop", wards: ["Chepterwai", "Kipkaren", "Kurgung/Surungai", "Kabiyet", "Ndolat", "Kabisaga", "Sangalo/Kebulonik"] }
        ]
    },
    "Baringo": {
        countyCode: 30,
        countyName: "Baringo",
        subCounties: ["Tiaty", "Baringo North", "Baringo Central", "Baringo South", "Mogotio", "Eldama Ravine"],
        constituencies: [
            { name: "Tiaty", wards: ["Tirioko", "Kolowa", "Ribkwo", "Silale", "Loiyamorock", "Tangulbei/Korossi", "Churo/Amaya"] },
            { name: "Baringo North", wards: ["Barwessa", "Kabartonjo", "Saimo/Kipsaraman", "Saimo/Soi", "Bartabwa"] },
            { name: "Baringo Central", wards: ["Kabarnet", "Sacho", "Tenges", "Ewalel Chapchap", "Kapropita"] },
            { name: "Baringo South", wards: ["Marigat", "Ilchamus", "Mochongoi", "Mukutani"] },
            { name: "Mogotio", wards: ["Mogotio", "Emining", "Kisanana"] },
            { name: "Eldama Ravine", wards: ["Lembus", "Lembus Kwen", "Ravine", "Mumberes/Maji Mazuri", "Lembus/Pekerra"] }
        ]
    },
    "Laikipia": {
        countyCode: 31,
        countyName: "Laikipia",
        subCounties: ["Laikipia West", "Laikipia East", "Laikipia North"],
        constituencies: [
            { name: "Laikipia West", wards: ["Ol-Moran", "Rumuruti Township", "Githiga", "Marmanet", "Igwamiti", "Salama"] },
            { name: "Laikipia East", wards: ["Ngobit", "Tigithi", "Thingithu", "Nanyuki", "Umande"] },
            { name: "Laikipia North", wards: ["Sosian", "Segera", "Mugogodo West", "Mugogodo East"] }
        ]
    },
    "Nakuru": {
        countyCode: 32,
        countyName: "Nakuru",
        subCounties: ["Molo", "Njoro", "Naivasha", "Gilgil", "Kuresoi South", "Kuresoi North", "Subukia", "Rongai", "Bahati", "Nakuru Town West", "Nakuru Town East"],
        constituencies: [
            { name: "Molo", wards: ["Mariashoni", "Elburgon", "Turi", "Molo"] },
            { name: "Njoro", wards: ["Mau Narok", "Mauche", "Kihingo", "Nesuit", "Lare", "Njoro"] },
            { name: "Naivasha", wards: ["Biashara", "Hells Gate", "Lake View", "Maiella", "Mai Mahiu", "Olkaria", "Naivasha East", "Viwandani"] },
            { name: "Gilgil", wards: ["Gilgil", "Elementaita", "Mbaruk/Eburu", "Malewa West", "Murindat"] },
            { name: "Kuresoi South", wards: ["Amalo", "Keringet", "Kiptagich", "Tinet"] },
            { name: "Kuresoi North", wards: ["Kiptororo", "Nyota", "Sirikwa", "Kamara"] },
            { name: "Subukia", wards: ["Subukia", "Waseges", "Kabazi"] },
            { name: "Rongai", wards: ["Menengai West", "Soin", "Visoi", "Mosop", "Solai"] },
            { name: "Bahati", wards: ["Dundori", "Kabatini", "Kiamaina", "Lanet/Umoja", "Bahati"] },
            { name: "Nakuru Town West", wards: ["Barut", "London", "Kaptembwo", "Kapkures", "Rhoda", "Shaabab"] },
            { name: "Nakuru Town East", wards: ["Biashara", "Kivumbini", "Flamingo", "Menengai", "Nakuru East"] }
        ]
    },
    "Narok": {
        countyCode: 33,
        countyName: "Narok",
        subCounties: ["Kilgoris", "Emurua Dikirr", "Narok North", "Narok East", "Narok South", "Narok West"],
        constituencies: [
            { name: "Kilgoris", wards: ["Kilgoris Central", "Keyian", "Angata Barikoi", "Shankoe", "Kimintet", "Lolgorian"] },
            { name: "Emurua Dikirr", wards: ["Ilkerin", "Ololmasani", "Mogondo", "Kapsasian"] },
            { name: "Narok North", wards: ["Olpusimoru", "Olorropil", "Melili", "Narok Town", "Nkareta", "Olokurto"] },
            { name: "Narok East", wards: ["Mosiro", "Ildamat", "Keekonyokie", "Suswa"] },
            { name: "Narok South", wards: ["Majimoto/Naroosura", "Ololulung'a", "Melelo", "Loita", "Sogoo", "Sagamian"] },
            { name: "Narok West", wards: ["Ilmotiok", "Mara", "Siana", "Naikarra"] }
        ]
    },
    "Kajiado": {
        countyCode: 34,
        countyName: "Kajiado",
        subCounties: ["Kajiado North", "Kajiado Central", "Kajiado East", "Kajiado West", "Kajiado South"],
        constituencies: [
            { name: "Kajiado North", wards: ["Olkeri", "Ongata Rongai", "Nkaimurunya", "Oloolua", "Ngong"] },
            { name: "Kajiado Central", wards: ["Purko", "Ildamat", "Dalalekutuk", "Matapato North", "Matapato South"] },
            { name: "Kajiado East", wards: ["Kaputiei North", "Kitengela", "Oloosirkon/Sholinke", "Kenyawa-Poka", "Imaroro"] },
            { name: "Kajiado West", wards: ["Keekonyokie", "Iloodokilani", "Magadi", "Ewuaso Oonkidong'i", "Mosiro"] },
            { name: "Kajiado South", wards: ["Entonet/Lenkisim", "Mbirikani/Eselenkei", "Kuku", "Rombo", "Kimana"] }
        ]
    },
    "Kericho": {
        countyCode: 35,
        countyName: "Kericho",
        subCounties: ["Kipkelion East", "Kipkelion West", "Ainamoi", "Bureti", "Belgut", "Sigowet/Soin"],
        constituencies: [
            { name: "Kipkelion East", wards: ["Londiani", "Kedowa/Kimugul", "Chepseon", "Tendeno/Sorget"] },
            { name: "Kipkelion West", wards: ["Kunyak", "Kamasian", "Kipkelion", "Chilchila"] },
            { name: "Ainamoi", wards: ["Kapsoit", "Ainamoi", "Kipchebor", "Kapkugerwet", "Kipchimchim", "Kapsaos"] },
            { name: "Bureti", wards: ["Kisiara", "Tebesonik", "Cheboin", "Chemosot", "Litein", "Cheplanget", "Kapkatet"] },
            { name: "Belgut", wards: ["Waldai", "Kabianga", "Cheptororiet/Seretut", "Chaik", "Kapsuser"] },
            { name: "Sigowet/Soin", wards: ["Sigowet", "Kaplelartet", "Soliat", "Soin"] }
        ]
    },
    "Bomet": {
        countyCode: 36,
        countyName: "Bomet",
        subCounties: ["Sotik", "Chepalungu", "Bomet East", "Bomet Central", "Konoin"],
        constituencies: [
            { name: "Sotik", wards: ["Ndanai/Abosi", "Chemagel", "Kipsonoi", "Aplet", "Rongena/Manaret"] },
            { name: "Chepalungu", wards: ["Kong'asis", "Nyangores", "Sigor", "Chebunyo", "Siongiroi"] },
            { name: "Bomet East", wards: ["Merigi", "Kembu", "Longisa", "Kipreres", "Chemaner"] },
            { name: "Bomet Central", wards: ["Silibwet Township", "Ndaraweta", "Singorwet", "Chesoen", "Mutarakwa"] },
            { name: "Konoin", wards: ["Chepchabas", "Kimulot", "Mogogosiek", "Boito", "Embomos"] }
        ]
    },
    "Kakamega": {
        countyCode: 37,
        countyName: "Kakamega",
        subCounties: ["Lugari", "Likuyani", "Malava", "Lurambi", "Navakholo", "Mumias West", "Mumias East", "Matungu", "Butere", "Khwisero", "Shinyalu", "Ikolomani"],
        constituencies: [
            { name: "Lugari", wards: ["Mautuma", "Lugari", "Lumakanda", "Chekalini", "Chevaywa", "Lwandeti"] },
            { name: "Likuyani", wards: ["Likuyani", "Sango", "Kongoni", "Sinoko", "Nzoia"] },
            { name: "Malava", wards: ["West Kabras", "Chemuche", "East Kabras", "Butali/Chegulo", "Manda-Shivanga", "Shirugu-Mugai", "South Kabras"] },
            { name: "Lurambi", wards: ["Butsotso East", "Butsotso South", "Butsotso Central", "Sheywe", "Mahiakalo", "Shirere"] },
            { name: "Navakholo", wards: ["Ingotse-Mathia", "Shinoyi-Shikomari-Esumeyia", "Bunyala West", "Bunyala East", "Bunyala Central"] },
            { name: "Mumias West", wards: ["Mumias Central", "Mumias North", "Etenje", "Musanda"] },
            { name: "Mumias East", wards: ["Lusheya/Lubinu", "Malaha/Isongo/Makunga", "East Wanga"] },
            { name: "Matungu", wards: ["Koyonzo", "Kholera", "Khalaba", "Mayoni", "Namamali"] },
            { name: "Butere", wards: ["Marama West", "Marama Central", "Marenyo - Shianda", "Marama North", "Marama South"] },
            { name: "Khwisero", wards: ["Kisa North", "Kisa East", "Kisa West", "Kisa Central"] },
            { name: "Shinyalu", wards: ["Isukha North", "Isukha Central", "Isukha South", "Isukha East", "Isukha West", "Murhanda"] },
            { name: "Ikolomani", wards: ["Idakho South", "Idakho East", "Idakho North", "Idakho Central"] }
        ]
    },
    "Vihiga": {
        countyCode: 38,
        countyName: "Vihiga",
        subCounties: ["Vihiga", "Sabatia", "Hamisi", "Luanda", "Emuhaya"],
        constituencies: [
            { name: "Vihiga", wards: ["Lugaga-Wamuluma", "South Maragoli", "Central Maragoli", "Mungoma"] },
            { name: "Sabatia", wards: ["Lyaduywa/Izava", "West Sabatia", "Chavakali", "North Maragoli", "Wodanga", "Busali"] },
            { name: "Hamisi", wards: ["Shiru", "Gisambai", "Shamakhokho", "Banja", "Muhudu", "Tambua", "Jepkoyai"] },
            { name: "Luanda", wards: ["Luanda Township", "Wemilabi", "Mwibona", "Luanda South", "Emabungo"] },
            { name: "Emuhaya", wards: ["North East Bunyore", "Central Bunyore", "West Bunyore"] }
        ]
    },
    "Bungoma": {
        countyCode: 39,
        countyName: "Bungoma",
        subCounties: ["Mount Elgon", "Sirisia", "Kabuchai", "Bumula", "Kanduyi", "Webuye East", "Webuye West", "Kimilili", "Tongaren"],
        constituencies: [
            { name: "Mount Elgon", wards: ["Cheptais", "Chesikaki", "Chepyuk", "Kapkateny", "Kaptama", "Elgon"] },
            { name: "Sirisia", wards: ["Namwela", "Malakisi/South Kulisiru", "Lwandanyi"] },
            { name: "Kabuchai", wards: ["Kabuchai/Chwele", "West Nalondo", "Bwake/Luuya", "Mukuyuni", "South Nalondo"] },
            { name: "Bumula", wards: ["South Bukusu", "Bumula", "Khasoko", "Kabula", "Kimaeti", "West Bukusu", "Siboti"] },
            { name: "Kanduyi", wards: ["Bukembe West", "Bukembe East", "Township", "Khalaba", "Musikoma", "East Sang'alo", "Marakaru/Tuuti", "West Sang'alo"] },
            { name: "Webuye East", wards: ["Mihuu", "Ndivisi", "Maraka"] },
            { name: "Webuye West", wards: ["Sitikho", "Matulo", "Bokoli"] },
            { name: "Kimilili", wards: ["Kibingei", "Kimilili", "Maeni", "Kamukuywa"] },
            { name: "Tongaren", wards: ["Mbakalo", "Naitiri/Kabuyefwe", "Milima", "Ndalu", "Tongaren", "Soysambu/Mitua"] }
        ]
    },
    "Busia": {
        countyCode: 40,
        countyName: "Busia",
        subCounties: ["Teso North", "Teso South", "Nambale", "Matayos", "Butula", "Funyula", "Budalangi"],
        constituencies: [
            { name: "Teso North", wards: ["Malaba Central", "Malaba North", "Ang'urai South", "Ang'urai North", "Ang'urai East", "Malaba South"] },
            { name: "Teso South", wards: ["Ang'orom", "Chakoi South", "Amukura West", "Amukura East", "Amukura Central", "Chakoi North"] },
            { name: "Nambale", wards: ["Nambale Township", "Bukhayo North/Waltsi", "Bukhayo East", "Bukhayo Central"] },
            { name: "Matayos", wards: ["Bukhayo West", "Mayenje", "Matayos South", "Busia Township", "Burumba"] },
            { name: "Butula", wards: ["Marachi West", "Marachi Central", "Marachi East", "Marachi North", "Elugulu", "Kingandole"] },
            { name: "Funyula", wards: ["Namboboto Nambuku", "Nangina", "Ageng'a Nanguba", "Bwiri"] },
            { name: "Budalangi", wards: ["Bunyala Central", "Bunyala North", "Bunyala West", "Bunyala South"] }
        ]
    },
    "Siaya": {
        countyCode: 41,
        countyName: "Siaya",
        subCounties: ["Ugenya", "Ugunja", "Alego Usonga", "Gem", "Bondo", "Rarieda"],
        constituencies: [
            { name: "Ugenya", wards: ["West Ugenya", "Ukwala", "North Ugenya", "East Ugenya"] },
            { name: "Ugunja", wards: ["Sidindi", "Sigomere", "Ugunja"] },
            { name: "Alego Usonga", wards: ["Usonga", "West Alego", "Central Alego", "Siaya Township", "North Alego", "South East Alego"] },
            { name: "Gem", wards: ["North Gem", "West Gem", "Central Gem", "Yala Township", "East Gem", "South Gem"] },
            { name: "Bondo", wards: ["West Yimbo", "Central Sakwa", "South Sakwa", "Yimbo East", "West Sakwa", "North Sakwa"] },
            { name: "Rarieda", wards: ["East Asembo", "West Asembo", "North Uyoma", "South Uyoma", "West Uyoma"] }
        ]
    },
    "Kisumu": {
        countyCode: 42,
        countyName: "Kisumu",
        subCounties: ["Kisumu East", "Kisumu West", "Kisumu Central", "Seme", "Nyando", "Muhoroni", "Nyakach"],
        constituencies: [
            { name: "Kisumu East", wards: ["Kajulu", "Kolwa East", "Manyatta B", "Nyalenda A", "Kolwa Central"] },
            { name: "Kisumu West", wards: ["South West Kisumu", "Central Kisumu", "Kisumu North", "West Kisumu", "North West Kisumu"] },
            { name: "Kisumu Central", wards: ["Railways", "Migosi", "Shaurimoyo Kaloleni", "Market Milimani", "Kondele", "Nyalenda B"] },
            { name: "Seme", wards: ["West Seme", "Central Seme", "East Seme", "North Seme"] },
            { name: "Nyando", wards: ["East Kano/Wawidhi", "Awasi/Onjiko", "Ahero", "Kabonyo/Kanyagwal", "Kobura"] },
            { name: "Muhoroni", wards: ["Miwani", "Ombeyi", "Masogo/Nyang'oma", "Chemelil", "Muhoroni/Koru"] },
            { name: "Nyakach", wards: ["South West Nyakach", "North Nyakach", "Central Nyakach", "West Nyakach", "South East Nyakach"] }
        ]
    },
    "Homa Bay": {
        countyCode: 43,
        countyName: "Homa Bay",
        subCounties: ["Kasipul", "Kabondo Kasipul", "Karachuonyo", "Rangwe", "Homa Bay Town", "Ndhiwa", "Suba North", "Suba South"],
        constituencies: [
            { name: "Kasipul", wards: ["West Kasipul", "South Kasipul", "Central Kasipul", "East Kamagak", "West Kamagak"] },
            { name: "Kabondo Kasipul", wards: ["Kabondo East", "Kabondo West", "Kokwanyo/Kakelo", "Kojwach"] },
            { name: "Karachuonyo", wards: ["West Karachuonyo", "North Karachuonyo", "Central", "Kanyaluo", "Kibiri", "Wangchieng", "Kendu Bay Town"] },
            { name: "Rangwe", wards: ["West Gem", "East Gem", "Kagan", "Kochia"] },
            { name: "Homa Bay Town", wards: ["Homa Bay Central", "Homa Bay Arujo", "Homa Bay West", "Homa Bay East"] },
            { name: "Ndhiwa", wards: ["Kwabwai", "Kanyadoto", "Kanyikela", "Kabuoch North", "Kabuoch South/Pala", "Kanyamwa Kologi", "Kanyamwa Kosewe"] },
            { name: "Suba North", wards: ["Rusinga Island", "Mfuka Island", "Gembe", "Lambwe", "Kasgunga"] },
            { name: "Suba South", wards: ["Gwassi South", "Gwassi North", "Kaksingri West", "Ruma Kaksingri"] }
        ]
    },
    "Migori": {
        countyCode: 44,
        countyName: "Migori",
        subCounties: ["Rongo", "Awendo", "Suna East", "Suna West", "Uriri", "Nyatike", "Kuria West", "Kuria East"],
        constituencies: [
            { name: "Rongo", wards: ["North Kamagambo", "Central Kamagambo", "East Kamagambo", "South Kamagambo"] },
            { name: "Awendo", wards: ["North Sakwa", "South Sakwa", "West Sakwa", "Central Sakwa"] },
            { name: "Suna East", wards: ["God Jope", "Suna Central", "Kakrao", "Kwa"] },
            { name: "Suna West", wards: ["Wiga", "Wasweta II", "Ragana-Oruba", "Wasimbete"] },
            { name: "Uriri", wards: ["West Kanyamkago", "North Kanyamkago", "Central Kanyamkago", "South Kanyamkago", "East Kanyamkago"] },
            { name: "Nyatike", wards: ["Kachieng'", "Kanyasa", "North Kadem", "Macalder/Kanyarwanda", "Kaler", "Got Kachola", "Muhuru"] },
            { name: "Kuria West", wards: ["Bukira East", "Bukira Central/Ikerege", "Isibania", "Makerero", "Masaba", "Tagare", "Nyamosense/Komosoko"] },
            { name: "Kuria East", wards: ["Gokeharaka/Getambwega", "Ntimaru West", "Ntimaru East", "Nyabasi East", "Nyabasi West"] }
        ]
    },
    "Kisii": {
        countyCode: 45,
        countyName: "Kisii",
        subCounties: ["Bonchari", "South Mugirango", "Bomachoge Borabu", "Bobasi", "Bomachoge Chache", "Nyaribari Masaba", "Nyaribari Chache", "Kitutu Chache North", "Kitutu Chache South"],
        constituencies: [
            { name: "Bonchari", wards: ["Bomorenda", "Riana", "Tabaka", "Bogiakumu"] },
            { name: "South Mugirango", wards: ["Bogetenga", "Borabu / Chitago", "Moticho", "Getenga", "Tabaka", "Boikanga"] },
            { name: "Bomachoge Borabu", wards: ["Bombaba Borabu", "Boochi Borabu", "Bokimonge", "Magenche"] },
            { name: "Bobasi", wards: ["Masige West", "Masige East", "Bobasi Central", "Nyacheki", "Bassi Bogetaorio", "Bobasi Chache", "Sameta/Mokwerero", "Bobasi/Boitangare"] },
            { name: "Bomachoge Chache", wards: ["Majoge Basi", "Boochi/Tendere", "Bosoti/Sengera"] },
            { name: "Nyaribari Masaba", wards: ["Ichuni", "Nyamasibi", "Masimba", "Gesusu", "Kiamokama"] },
            { name: "Nyaribari Chache", wards: ["Bobaracho", "Kisii Central", "Keumbu", "Kiogoro", "Ibeno", "Birongo"] },
            { name: "Kitutu Chache North", wards: ["Monyerero", "Sensi", "Marani", "Kegogi"] },
            { name: "Kitutu Chache South", wards: ["Bogusero", "Bogeka", "Nyakoe", "Kitutu Central", "Nyatieko"] }
        ]
    },
    "Nyamira": {
        countyCode: 46,
        countyName: "Nyamira",
        subCounties: ["Kitutu Masaba", "West Mugirango", "North Mugirango", "Borabu"],
        constituencies: [
            { name: "Kitutu Masaba", wards: ["Rigoma", "Gachuba", "Kemera", "Magombo", "Manga", "Gesima"] },
            { name: "West Mugirango", wards: ["Nyamaiya", "Bogichora", "Bosamaro", "Bonyamatuta", "Township"] },
            { name: "North Mugirango", wards: ["Itibo", "Bomwagamo", "Bokeira", "Magwagwa", "Ekerenyo"] },
            { name: "Borabu", wards: ["Mekenene", "Kiabonyoru", "Nyansiongo", "Esise"] }
        ]
    },
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
            { name: "Westlands", wards: ["Kitisuru", "Parklands/Highridge", "Karura", "Kangemi", "Mountain View"] },
            { name: "Dagoretti North", wards: ["Kilimani", "Kawangware", "Gatina", "Kileleshwa", "Kabiro"] },
            { name: "Dagoretti South", wards: ["Mutu-ini", "Ngando", "Riruta", "Uthiru/Ruthimitu", "Waithaka"] },
            { name: "Lang'ata", wards: ["Karen", "Nairobi West", "Mugumo-ini", "South C", "Nyayo Highrise"] },
            { name: "Kibra", wards: ["Laini Saba", "Lindi", "Makina", "Woodley/Kenyatta Golf Course", "Sarang'ombe"] },
            { name: "Roysambu", wards: ["Githurai", "Kahawa West", "Zimmerman", "Roysambu", "Kahawa"] },
            { name: "Kasarani", wards: ["Clay City", "Mwiki", "Kasarani", "Njiru", "Ruai"] },
            { name: "Ruaraka", wards: ["Babadogo", "Utalii", "Mathare North", "Lucky Summer", "Korogocho"] },
            { name: "Embakasi South", wards: ["Imara Daima", "Kwa Njenga", "Kwa Reuben", "Pipeline", "Kware"] },
            { name: "Embakasi North", wards: ["Kariobangi North", "Dandora Area I", "Dandora Area II", "Dandora Area III", "Dandora Area IV"] },
            { name: "Embakasi Central", wards: ["Kayole North", "Kayole Central", "Kayole South", "Komarock", "Matopeni/Spring Valley"] },
            { name: "Embakasi East", wards: ["Upper Savanna", "Lower Savanna", "Embakasi", "Utawala", "Mihango"] },
            { name: "Embakasi West", wards: ["Umoja I", "Umoja II", "Mowlem", "Kariobangi South"] },
            { name: "Makadara", wards: ["Maringo/Hamza", "Viwandani", "Harambee", "Makongeni"] },
            { name: "Kamukunji", wards: ["Pumwani", "Eastleigh North", "Eastleigh South", "Airbase", "California"] },
            { name: "Starehe", wards: ["Nairobi Central", "Ngara", "Pangani", "Ziwani/Kariokor", "Landi Mawe", "Nairobi South"] },
            { name: "Mathare", wards: ["Hospital", "Mabatini", "Huruma", "Ngei", "Mlango Kubwa", "Kiamaiko"] }
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
    "Samburu", "Trans Nzoia", "Uasin Gishu", "Elgeyo-Marakwet", "Nandi",
    "Baringo", "Laikipia", "Nakuru", "Narok", "Kajiado", "Kericho",
    "Bomet", "Kakamega", "Vihiga", "Bungoma", "Busia", "Siaya",
    "Kisumu", "Homa Bay", "Migori", "Kisii", "Nyamira", "Nairobi"
];

export const KENYA_COUNTIES_LIST: string[] = Object.keys(KENYA_ADMIN_DATA).sort();

/**
 * Normalizes county name to match dictionary key reliably
 */
export function normalizeCountyName(countyName?: string): string | null {
    if (!countyName) return null;
    const clean = countyName.trim().toLowerCase().replace(/['’_\-\s]+/g, '');
    const found = Object.keys(KENYA_ADMIN_DATA).find(k => {
        const kClean = k.toLowerCase().replace(/['’_\-\s]+/g, '');
        return kClean === clean || clean.includes(kClean) || kClean.includes(clean);
    });
    return found || null;
}

/**
 * Resolves all available Sub-Counties for a given County name.
 */
export function getSubCountiesForCounty(countyName?: string, dynamicSubCounties: string[] = []): string[] {
    const key = normalizeCountyName(countyName);
    const staticList = key ? KENYA_ADMIN_DATA[key].subCounties : [];
    const combined = Array.from(new Set([...staticList, ...dynamicSubCounties])).filter(Boolean).sort();
    return combined;
}

/**
 * Resolves all Constituencies for a given County name.
 */
export function getConstituenciesForCounty(countyName?: string, dynamicConstituencies: string[] = []): string[] {
    const key = normalizeCountyName(countyName);
    const staticList = key ? KENYA_ADMIN_DATA[key].constituencies.map(c => c.name) : [];
    const combined = Array.from(new Set([...staticList, ...dynamicConstituencies])).filter(Boolean).sort();
    return combined;
}

/**
 * Resolves all Wards for a given County & Constituency/SubCounty name.
 */
export function getWardsForConstituency(countyName?: string, constituencyName?: string, dynamicWards: string[] = []): string[] {
    let staticWards: string[] = [];
    const key = normalizeCountyName(countyName);

    if (key) {
        const countyObj = KENYA_ADMIN_DATA[key];
        if (constituencyName && constituencyName.trim()) {
            const cleanConst = constituencyName.trim().toLowerCase().replace(/['’_\-\s]+/g, '');
            const matchedConst = countyObj.constituencies.find(c => {
                const cClean = c.name.toLowerCase().replace(/['’_\-\s]+/g, '');
                return cClean === cleanConst || cleanConst.includes(cClean) || cClean.includes(cleanConst);
            });
            if (matchedConst) {
                staticWards = matchedConst.wards;
            } else {
                // If not found in constituencies, check if subcounty name maps to any constituency
                staticWards = countyObj.constituencies.flatMap(c => c.wards);
            }
        } else {
            // Return all wards in county
            staticWards = countyObj.constituencies.flatMap(c => c.wards);
        }
    } else if (constituencyName && constituencyName.trim()) {
        // Search across all counties for this constituency
        const cleanConst = constituencyName.trim().toLowerCase().replace(/['’_\-\s]+/g, '');
        for (const cKey of Object.keys(KENYA_ADMIN_DATA)) {
            const matched = KENYA_ADMIN_DATA[cKey].constituencies.find(c => {
                const cClean = c.name.toLowerCase().replace(/['’_\-\s]+/g, '');
                return cClean === cleanConst || cleanConst.includes(cClean) || cClean.includes(cleanConst);
            });
            if (matched) {
                staticWards = matched.wards;
                break;
            }
        }
    }

    const combined = Array.from(new Set([...staticWards, ...dynamicWards])).filter(Boolean).sort();
    return combined;
}

/**
 * Auto-detects County, Constituency, SubCounty, and Ward based on a text string or search keyword.
 * e.g. "NDONYO NGARIA ECD" -> Ward: "Ndonyo Ngaria", Constituency: "Kiambaa", County: "Kiambu"
 */
export function detectAdministrativeBoundary(text?: string): {
    county?: string;
    constituency?: string;
    subCounty?: string;
    ward?: string;
} | null {
    if (!text || !text.trim()) return null;
    const cleanText = text.toLowerCase();

    for (const [cName, cData] of Object.entries(KENYA_ADMIN_DATA)) {
        for (const constObj of cData.constituencies) {
            for (const ward of constObj.wards) {
                const cleanWard = ward.toLowerCase();
                if (cleanWard.length > 3 && cleanText.includes(cleanWard)) {
                    return {
                        county: cName,
                        constituency: constObj.name,
                        subCounty: cData.subCounties.find(s => s.toLowerCase() === constObj.name.toLowerCase()) || constObj.name,
                        ward: ward
                    };
                }
            }

            const cleanConst = constObj.name.toLowerCase();
            if (cleanConst.length > 3 && cleanText.includes(cleanConst)) {
                return {
                    county: cName,
                    constituency: constObj.name,
                    subCounty: cData.subCounties.find(s => s.toLowerCase() === cleanConst) || constObj.name
                };
            }
        }

        const cleanCounty = cName.toLowerCase();
        if (cleanCounty.length > 3 && cleanText.includes(cleanCounty)) {
            return {
                county: cName
            };
        }
    }

    return null;
}
