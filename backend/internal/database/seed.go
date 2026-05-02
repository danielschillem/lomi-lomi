package database

import (
	"log"
	"time"

	"github.com/lomilomi/backend/internal/models"
	"golang.org/x/crypto/bcrypt"
)

// Seed inserts demo data if the database is empty (no products exist).
// Safe to call on every startup - skips if data already present.
func Seed() {
	var count int64
	DB.Model(&models.Product{}).Count(&count)
	if count > 0 {
		log.Println("Seed: data already present, skipping")
		return
	}
	log.Println("Seed: inserting demo data...")

	now := time.Now()
	hash, _ := bcrypt.GenerateFromPassword([]byte("Demo1234!"), bcrypt.DefaultCost)
	pw := string(hash)

	// - Users -
	bd1 := time.Date(1995, 3, 15, 0, 0, 0, 0, time.UTC)
	bd2 := time.Date(1992, 7, 22, 0, 0, 0, 0, time.UTC)
	bd3 := time.Date(1998, 11, 5, 0, 0, 0, 0, time.UTC)
	bd4 := time.Date(1990, 1, 10, 0, 0, 0, 0, time.UTC)
	bd5 := time.Date(1996, 6, 28, 0, 0, 0, 0, time.UTC)

	users := []models.User{
		{Username: "aissata_ouaga", Email: "aissata@demo.com", Phone: "+22670110001", Password: pw, Bio: "Passionnee de danse et de voyages", Gender: "female", LookingFor: "male", BirthDate: &bd1, City: "Ouagadougou", Latitude: 12.3714, Longitude: -1.5197, IsVerified: true, Role: "user"},
		{Username: "moussa_bobo", Email: "moussa@demo.com", Phone: "+22676110002", Password: pw, Bio: "Chef cuisinier, passionne de saveurs locales", Gender: "male", LookingFor: "female", BirthDate: &bd2, City: "Bobo-Dioulasso", Latitude: 11.1771, Longitude: -4.2979, IsVerified: true, Role: "user"},
		{Username: "mariam_ouaga", Email: "mariam@demo.com", Phone: "+22665110003", Password: pw, Bio: "Styliste et creatrice de mode africaine", Gender: "female", LookingFor: "male", BirthDate: &bd3, City: "Ouagadougou", Latitude: 12.3686, Longitude: -1.5275, IsVerified: true, Role: "user"},
		{Username: "ibrahim_owner", Email: "ibrahim@demo.com", Phone: "+22670110004", Password: pw, Bio: "Entrepreneur dans le bien-être et l'hôtellerie", Gender: "male", LookingFor: "female", BirthDate: &bd4, City: "Ouagadougou", Latitude: 12.3750, Longitude: -1.5150, IsVerified: true, Role: "owner"},
		{Username: "fatou_bobo", Email: "fatou@demo.com", Phone: "+22676110005", Password: pw, Bio: "Artiste et creatrice de bijoux en bronze", Gender: "female", LookingFor: "male", BirthDate: &bd5, City: "Bobo-Dioulasso", Latitude: 11.1800, Longitude: -4.2900, IsVerified: true, Role: "user"},
	}
	DB.Create(&users)
	log.Printf("Seed: created %d users", len(users))

	// - Photos -
	photos := []models.Photo{
		{UserID: users[0].ID, URL: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400", Position: 0},
		{UserID: users[0].ID, URL: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400", Position: 1},
		{UserID: users[1].ID, URL: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400", Position: 0},
		{UserID: users[2].ID, URL: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400", Position: 0},
		{UserID: users[3].ID, URL: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400", Position: 0},
		{UserID: users[4].ID, URL: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=400", Position: 0},
	}
	DB.Create(&photos)

	// - User Preferences -
	prefs := []models.UserPreference{
		{UserID: users[0].ID, MinAge: 25, MaxAge: 40, MaxDistance: 50, Gender: "male", Interests: `["danse","voyage","cuisine"]`},
		{UserID: users[1].ID, MinAge: 22, MaxAge: 38, MaxDistance: 30, Gender: "female", Interests: `["cuisine","musique","cinéma"]`},
		{UserID: users[2].ID, MinAge: 23, MaxAge: 35, MaxDistance: 40, Gender: "male", Interests: `["mode","fitness","art"]`},
		{UserID: users[4].ID, MinAge: 24, MaxAge: 40, MaxDistance: 100, Gender: "male", Interests: `["art","bijoux","voyage"]`},
	}
	DB.Create(&prefs)

	// - Likes & Matches -
	likes := []models.Like{
		{LikerID: users[0].ID, LikedID: users[1].ID},
		{LikerID: users[1].ID, LikedID: users[0].ID},
		{LikerID: users[2].ID, LikedID: users[1].ID},
		{LikerID: users[4].ID, LikedID: users[1].ID},
	}
	DB.Create(&likes)

	matches := []models.Match{
		{User1ID: users[0].ID, User2ID: users[1].ID},
	}
	DB.Create(&matches)

	// - Conversations & Messages -
	convos := []models.Conversation{
		{User1ID: users[0].ID, User2ID: users[1].ID},
	}
	DB.Create(&convos)

	msgs := []models.Message{
		{ConversationID: convos[0].ID, SenderID: users[0].ID, Content: "Salut Moussa ! Ton profil m'a beaucoup plu ", IsRead: true},
		{ConversationID: convos[0].ID, SenderID: users[1].ID, Content: "Merci Aïssata ! Tu aimes la cuisine locale aussi ?", IsRead: true},
		{ConversationID: convos[0].ID, SenderID: users[0].ID, Content: "J'adore ! Tu me fais goûter ton tô sauce ?", IsRead: false},
	}
	DB.Create(&msgs)

	// - Notifications -
	notifs := []models.Notification{
		{UserID: users[0].ID, Type: "match", Title: "Nouveau match !", Body: "Moussa et vous avez matché", Data: `{"match_id":1}`},
		{UserID: users[1].ID, Type: "match", Title: "Nouveau match !", Body: "Aïssata et vous avez matché", Data: `{"match_id":1}`},
		{UserID: users[1].ID, Type: "message", Title: "Nouveau message", Body: "Aïssata vous a envoyé un message", Data: `{"conversation_id":1}`, IsRead: true},
	}
	DB.Create(&notifs)

	// - Products (Boutique) -
	products := []models.Product{
		{OwnerID: users[3].ID, Name: "Beurre de karité pur du Burkina", Description: "Beurre de karité 100% naturel de la région de Banfora. Hydratant corps et cheveux.", Price: 3500, ImageURL: "https://images.unsplash.com/photo-1600428877878-1a0fd85beda8?w=400", Category: "soins", Stock: 50, IsActive: true},
		{OwnerID: users[3].ID, Name: "Bougie parfumée Fleur de Néré", Description: "Bougie artisanale au parfum de néré et encens du Sahel. 40h de combustion.", Price: 5000, ImageURL: "https://images.unsplash.com/photo-1602607726657-e4e1a30e4c1e?w=400", Category: "ambiance", Stock: 35, IsActive: true},
		{OwnerID: users[3].ID, Name: "Coffret duo bien-être Sahélien", Description: "Coffret comprenant beurre de karité, huile de balanites, bougie parfumée et 2 serviettes en coton tissé.", Price: 15000, ImageURL: "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=400", Category: "coffrets", Stock: 20, IsActive: true},
		{OwnerID: users[3].ID, Name: "Natte de yoga en raphia tressé", Description: "Natte artisanale en raphia tressé du Burkina. Idéal pour yoga et méditation.", Price: 12000, ImageURL: "https://images.unsplash.com/photo-1592432678016-e910b452f9a2?w=400", Category: "yoga", Stock: 15, IsActive: true},
		{OwnerID: users[3].ID, Name: "Encens du Sahel (lot de 12)", Description: "Bâtonnets d'encens artisanaux aux résines et plantes du Sahel burkinabè.", Price: 2500, ImageURL: "https://images.unsplash.com/photo-1600431521340-491eca880813?w=400", Category: "ambiance", Stock: 100, IsActive: true},
		{OwnerID: users[3].ID, Name: "Diffuseur huiles essentielles", Description: "Diffuseur ultrasonique en bois de vène. Capacité 300ml, brume froide, LED multicolore.", Price: 15000, ImageURL: "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=400", Category: "ambiance", Stock: 25, IsActive: true},
		{OwnerID: users[4].ID, Name: "Bracelet bronze Tifinagh", Description: "Bracelet artisanal en bronze avec motifs Tifinagh. Fabrication artisanale de Bobo-Dioulasso.", Price: 7500, ImageURL: "https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=400", Category: "bijoux", Stock: 40, IsActive: true},
		{OwnerID: users[4].ID, Name: "Collier cauris et perles", Description: "Collier artisanal en coquillages cauris et perles de verre. Cordon en cuir tressé.", Price: 5000, ImageURL: "https://images.unsplash.com/photo-1515562141589-67f0d0e4de01?w=400", Category: "bijoux", Stock: 30, IsActive: true},
		{OwnerID: users[3].ID, Name: "Gommage corporel Karité-Café", Description: "Gommage exfoliant au beurre de karité et café de Banfora. 250g.", Price: 4500, ImageURL: "https://images.unsplash.com/photo-1608181831718-20bf4b1b2efa?w=400", Category: "soins", Stock: 45, IsActive: true},
		{OwnerID: users[3].ID, Name: "Coussin de méditation en bogolan", Description: "Coussin rond recouvert de tissu bogolan teint à la main. Rembourrage en kapok naturel.", Price: 8500, ImageURL: "https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=400", Category: "yoga", Stock: 18, IsActive: true},
	}
	DB.Create(&products)
	log.Printf("Seed: created %d products", len(products))

	// - Delivery Addresses -
	addresses := []models.DeliveryAddress{
		{UserID: users[0].ID, Label: "Maison", FullName: "Aïssata Ouédraogo", Phone: "+22670110001", Address: "Quartier Koulouba, Secteur 4", City: "Ouagadougou", PostalCode: "01", Country: "Burkina Faso", IsDefault: true},
		{UserID: users[1].ID, Label: "Bureau", FullName: "Moussa Traoré", Phone: "+22676110002", Address: "Avenue de la Révolution, Secteur 1", City: "Bobo-Dioulasso", PostalCode: "01", Country: "Burkina Faso", IsDefault: true},
	}
	DB.Create(&addresses)

	// - Orders -
	orders := []models.Order{
		{UserID: users[0].ID, TotalAmount: 8500, Status: "delivered", DeliveryAddressID: &addresses[0].ID},
		{UserID: users[1].ID, TotalAmount: 12000, Status: "confirmed", DeliveryAddressID: &addresses[1].ID},
		{UserID: users[0].ID, TotalAmount: 3500, Status: "pending"},
	}
	DB.Create(&orders)

	orderItems := []models.OrderItem{
		{OrderID: orders[0].ID, ProductID: products[0].ID, Quantity: 1, Price: 3500},
		{OrderID: orders[0].ID, ProductID: products[1].ID, Quantity: 1, Price: 5000},
		{OrderID: orders[1].ID, ProductID: products[3].ID, Quantity: 1, Price: 12000},
		{OrderID: orders[2].ID, ProductID: products[0].ID, Quantity: 1, Price: 3500},
	}
	DB.Create(&orderItems)

	// - Places -
	places := []models.Place{
		{OwnerID: users[3].ID, Name: "Hôtel Ran", Description: "Hôtel de charme au cœur de Ouagadougou. Piscine, spa, restaurant gastronomique avec vue sur la ville.", Category: "hotel", Address: "Avenue Kwame Nkrumah, Secteur 4", City: "Ouagadougou", Latitude: 12.3657, Longitude: -1.5177, ImageURL: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400", Phone: "+22625306070", Website: "https://hotelran.example.com", Rating: 4.7, IsPartner: true},
		{OwnerID: users[3].ID, Name: "Restaurant Le Verdoyant", Description: "Cuisine burkinabè raffinée et grillades. Cadre verdoyant avec terrasse ombragée. Spécialités : poulet bicyclette, riz gras.", Category: "restaurant", Address: "Rue de la Chance, Ouaga 2000", City: "Ouagadougou", Latitude: 12.3450, Longitude: -1.5050, ImageURL: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400", Phone: "+22625376890", Website: "https://leverdoyant.example.com", Rating: 4.5, IsPartner: true},
		{OwnerID: users[3].ID, Name: "Spa Laafi", Description: "Centre de bien-être premium à Ouaga 2000. Hammam, sauna, jacuzzi et soins au beurre de karité. Formules duo.", Category: "leisure", Address: "Boulevard France-Afrique, Ouaga 2000", City: "Ouagadougou", Latitude: 12.3500, Longitude: -1.5100, ImageURL: "https://images.unsplash.com/photo-1540555700478-4be289fbec6d?w=400", Phone: "+22625490123", Rating: 4.8, IsPartner: true},
		{OwnerID: users[3].ID, Name: "Maquis Djoula", Description: "Maquis traditionnel au bord du Houet. Tô sauce gombo, brochettes, dolo frais. Ambiance musicale le week-end.", Category: "restaurant", Address: "Quartier Dioulassoba", City: "Bobo-Dioulasso", Latitude: 11.1780, Longitude: -4.2970, ImageURL: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400", Phone: "+22620971234", Rating: 4.3, IsPartner: false},
		{OwnerID: users[3].ID, Name: "Hôtel L'Auberge", Description: "Hôtel familial avec piscine au cœur de Bobo. Chambres climatisées, jardin tropical, petit-déjeuner buffet.", Category: "hotel", Address: "Avenue de l'Unité, Secteur 1", City: "Bobo-Dioulasso", Latitude: 11.1750, Longitude: -4.2920, ImageURL: "https://images.unsplash.com/photo-1590073242678-70ee3fc28f17?w=400", Phone: "+22620972345", Rating: 4.6, IsPartner: true},
		{OwnerID: users[3].ID, Name: "Piscine Lagon Bleu", Description: "Complexe aquatique et lounge bar. DJ sets le samedi, cocktails locaux, grillades en plein air.", Category: "leisure", Address: "Route de Bobo, Secteur 28", City: "Ouagadougou", Latitude: 12.3600, Longitude: -1.5400, ImageURL: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400", Phone: "+22625367890", Rating: 4.1, IsPartner: false},
		{OwnerID: users[4].ID, Name: "Restaurant Gondwana", Description: "Cuisine africaine fusion à Bobo. Thiéboudienne, attiéké poisson, jus de bissap et gingembre frais.", Category: "restaurant", Address: "Rue du Commerce, Secteur 8", City: "Bobo-Dioulasso", Latitude: 11.1810, Longitude: -4.2950, ImageURL: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400", Phone: "+22620975678", Rating: 4.6, IsPartner: true},
		{OwnerID: users[3].ID, Name: "Parc Bangr Wéogo", Description: "Parc urbain naturel de 260 ha au cœur de Ouagadougou. Balade en couple, pique-nique, observation d'animaux.", Category: "leisure", Address: "Avenue Charles de Gaulle", City: "Ouagadougou", Latitude: 12.3780, Longitude: -1.5080, ImageURL: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400", Phone: "+22625308765", Rating: 4.4, IsPartner: false},
	}
	DB.Create(&places)
	log.Printf("Seed: created %d places", len(places))

	// - Place Reservations -
	futureDate := now.AddDate(0, 0, 14)
	pastDate := now.AddDate(0, 0, -7)
	placeRes := []models.PlaceReservation{
		{PlaceID: places[1].ID, UserID: users[0].ID, Date: futureDate, Persons: 2, Status: "confirmed", Notes: "Table en terrasse si possible"},
		{PlaceID: places[0].ID, UserID: users[0].ID, Date: futureDate, EndDate: futureDate.AddDate(0, 0, 2), Persons: 2, Status: "confirmed", Notes: "Suite avec vue"},
		{PlaceID: places[3].ID, UserID: users[1].ID, Date: pastDate, Persons: 4, Status: "completed"},
	}
	DB.Create(&placeRes)

	// - Wellness Providers -
	providers := []models.WellnessProvider{
		{OwnerID: users[3].ID, Name: "Zen & Karité", Description: "Centre de massage et relaxation au cœur de Ouagadougou. Soins traditionnels au karité et techniques modernes.", Category: "spa", ImageURL: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400", Phone: "+22670210987", Email: "contact@zenkarite.bf", Address: "Boulevard de la Révolution, Secteur 4", City: "Ouagadougou", Latitude: 12.3700, Longitude: -1.5200, Rating: 4.8, ReviewCount: 24, Certifications: `["FFMBE","Praticien certifié"]`, MobileService: false, IsVerified: true, IsActive: true},
		{OwnerID: users[3].ID, Name: "Massage Bien-Être à Domicile", Description: "Massages bien-être à domicile. Déplacement dans tout Ouagadougou avec matériel complet.", Category: "massage_home", ImageURL: "https://images.unsplash.com/photo-1519823551278-64ac92734314?w=400", Phone: "+22678901234", Email: "bienetre@massage.bf", Address: "Ouagadougou - Déplacement", City: "Ouagadougou", Latitude: 12.3650, Longitude: -1.5250, Rating: 4.9, ReviewCount: 42, Certifications: `["FFMBE","Réflexologie"]`, MobileService: true, IsVerified: true, IsActive: true},
		{OwnerID: users[3].ID, Name: "Studio Yoga Sahel", Description: "Cours de yoga et méditation pour tous niveaux. Hatha, Vinyasa, Yin Yoga. Cours individuels et en duo.", Category: "yoga", ImageURL: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400", Phone: "+22670456789", Email: "info@yogasahel.bf", Address: "Quartier Patte d'Oie, Secteur 15", City: "Ouagadougou", Latitude: 12.3580, Longitude: -1.5350, Rating: 4.6, ReviewCount: 18, Certifications: `["Yoga Alliance RYT-500"]`, MobileService: false, IsVerified: true, IsActive: true},
		{OwnerID: users[4].ID, Name: "Spa Dafra Bobo", Description: "Spa de charme près des cascades de Banfora. Soins traditionnels africains, beurre de karité, argile du Sahel.", Category: "spa", ImageURL: "https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?w=400", Phone: "+22676567890", Email: "spa@dafra.bf", Address: "Quartier Tounouma, Secteur 2", City: "Bobo-Dioulasso", Latitude: 11.1760, Longitude: -4.3000, Rating: 4.7, ReviewCount: 15, Certifications: `["CIDESCO"]`, MobileService: false, IsVerified: true, IsActive: true},
		{OwnerID: users[3].ID, Name: "Coach Abdoul Fit", Description: "Coaching sportif personnalisé à Ouaga. Remise en forme, perte de poids, préparation physique. En salle ou en extérieur.", Category: "coaching", ImageURL: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400", Phone: "+22670987654", Email: "abdoul@coachfit.bf", Address: "Parc Bangr Wéogo", City: "Ouagadougou", Latitude: 12.3790, Longitude: -1.5090, Rating: 4.5, ReviewCount: 31, Certifications: `["BPJEPS","CrossFit L2"]`, MobileService: true, IsVerified: true, IsActive: true},
	}
	DB.Create(&providers)
	log.Printf("Seed: created %d wellness providers", len(providers))

	// - Wellness Services -
	services := []models.WellnessService{
		// Zen & Karité
		{ProviderID: providers[0].ID, Name: "Massage relaxant karité", Description: "Massage suédois au beurre de karité pur. Détente profonde du corps et de l'esprit.", Duration: 60, Price: 15000, Category: "relaxation", IsDuo: false, IsActive: true},
		{ProviderID: providers[0].ID, Name: "Massage duo relaxant", Description: "Massage relaxant en duo dans notre salle VIP. 2 praticiens simultanés.", Duration: 60, Price: 25000, Category: "relaxation", IsDuo: true, IsActive: true},
		{ProviderID: providers[0].ID, Name: "Massage pierres chaudes", Description: "Massage aux pierres de basalte chauffées. Dénoue les tensions musculaires.", Duration: 90, Price: 20000, Category: "hot_stones", IsDuo: false, IsActive: true},
		{ProviderID: providers[0].ID, Name: "Massage traditionnel africain", Description: "Massage traditionnel aux huiles de balanites et beurre de karité. Rééquilibre les énergies.", Duration: 75, Price: 18000, Category: "thai", IsDuo: false, IsActive: true},
		// Massage Bien-Être à Domicile
		{ProviderID: providers[1].ID, Name: "Massage relaxant à domicile", Description: "Déplacement chez vous avec table de massage et huiles naturelles du Burkina.", Duration: 60, Price: 20000, Category: "relaxation", IsDuo: false, IsActive: true},
		{ProviderID: providers[1].ID, Name: "Massage duo à domicile", Description: "Massage en duo chez vous. 2 tables, 2 praticiens. Tout Ouagadougou.", Duration: 60, Price: 35000, Category: "relaxation", IsDuo: true, IsActive: true},
		{ProviderID: providers[1].ID, Name: "Massage sportif", Description: "Massage profond pour sportifs. Récupération musculaire et décontraction.", Duration: 45, Price: 12000, Category: "sport", IsDuo: false, IsActive: true},
		// Studio Yoga Sahel
		{ProviderID: providers[2].ID, Name: "Cours Hatha Yoga", Description: "Cours de Hatha Yoga pour débutants et intermédiaires. Postures, respiration, méditation.", Duration: 75, Price: 5000, Category: "yoga", IsDuo: false, IsActive: true},
		{ProviderID: providers[2].ID, Name: "Yoga duo en privé", Description: "Cours privé de yoga pour 2 personnes. Programme personnalisé selon vos besoins.", Duration: 90, Price: 15000, Category: "yoga", IsDuo: true, IsActive: true},
		{ProviderID: providers[2].ID, Name: "Méditation guidée", Description: "Séance de méditation de pleine conscience. Techniques de respiration et relaxation profonde.", Duration: 45, Price: 3000, Category: "meditation", IsDuo: false, IsActive: true},
		// Spa Dafra Bobo
		{ProviderID: providers[3].ID, Name: "Soin Karité Royal", Description: "Gommage au sable fin du Sahel suivi d'un enveloppement au beurre de karité pur.", Duration: 90, Price: 10000, Category: "relaxation", IsDuo: false, IsActive: true},
		{ProviderID: providers[3].ID, Name: "Massage duo Dafra", Description: "Massage en duo dans notre salle avec vue. Huiles de neem et beurre de karité.", Duration: 75, Price: 18000, Category: "relaxation", IsDuo: true, IsActive: true},
		// Coach Abdoul Fit
		{ProviderID: providers[4].ID, Name: "Coaching individuel", Description: "Séance de sport personnalisée au Parc Bangr Wéogo. Cardio, renforcement, stretching.", Duration: 60, Price: 10000, Category: "sport", IsDuo: false, IsActive: true},
		{ProviderID: providers[4].ID, Name: "Coaching duo", Description: "Séance de sport en binôme. Plus fun, plus motivant !", Duration: 60, Price: 15000, Category: "sport", IsDuo: true, IsActive: true},
	}
	DB.Create(&services)
	log.Printf("Seed: created %d wellness services", len(services))

	// - Wellness Availabilities -
	avails := []models.WellnessAvailability{}
	for _, p := range providers {
		// Monday to Friday 09:00-19:00
		for d := 1; d <= 5; d++ {
			avails = append(avails, models.WellnessAvailability{ProviderID: p.ID, DayOfWeek: d, StartTime: "09:00", EndTime: "19:00"})
		}
		// Saturday 10:00-17:00
		avails = append(avails, models.WellnessAvailability{ProviderID: p.ID, DayOfWeek: 6, StartTime: "10:00", EndTime: "17:00"})
	}
	DB.Create(&avails)

	// - Wellness Bookings -
	futureBooking := now.AddDate(0, 0, 7)
	pastBooking := now.AddDate(0, 0, -14)
	guestID := users[1].ID

	bookings := []models.WellnessBooking{
		{UserID: users[0].ID, ServiceID: services[0].ID, ProviderID: providers[0].ID, Date: futureBooking, StartTime: "14:00", EndTime: "15:00", Persons: 1, Status: "confirmed", TotalPrice: 15000, Notes: "Première visite"},
		{UserID: users[0].ID, ServiceID: services[1].ID, ProviderID: providers[0].ID, Date: futureBooking.AddDate(0, 0, 3), StartTime: "16:00", EndTime: "17:00", Persons: 2, GuestID: &guestID, Status: "confirmed", TotalPrice: 25000, Notes: "Massage duo avec Moussa"},
		{UserID: users[1].ID, ServiceID: services[4].ID, ProviderID: providers[1].ID, Date: pastBooking, StartTime: "10:00", EndTime: "11:00", Persons: 1, Status: "completed", TotalPrice: 20000},
		{UserID: users[2].ID, ServiceID: services[7].ID, ProviderID: providers[2].ID, Date: pastBooking.AddDate(0, 0, 2), StartTime: "09:00", EndTime: "10:15", Persons: 1, Status: "completed", TotalPrice: 5000},
		{UserID: users[4].ID, ServiceID: services[10].ID, ProviderID: providers[3].ID, Date: pastBooking.AddDate(0, 0, 5), StartTime: "11:00", EndTime: "12:30", Persons: 1, Status: "completed", TotalPrice: 10000},
	}
	DB.Create(&bookings)

	// - Wellness Reviews -
	reviews := []models.WellnessReview{
		{UserID: users[1].ID, BookingID: bookings[2].ID, ProviderID: providers[1].ID, Rating: 5, Comment: "Excellent massage à domicile ! Très professionnel, je recommande à 100%."},
		{UserID: users[2].ID, BookingID: bookings[3].ID, ProviderID: providers[2].ID, Rating: 4, Comment: "Très bon cours de yoga, prof attentif. Studio agréable."},
		{UserID: users[4].ID, BookingID: bookings[4].ID, ProviderID: providers[3].ID, Rating: 5, Comment: "Le soin Karité Royal est divin ! Cadre magnifique à Bobo."},
	}
	DB.Create(&reviews)

	log.Println("Seed: demo data inserted successfully ")
}
