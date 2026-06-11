// =============================================================================
// Neo4j initialization – automotive-ai-platform
// Run via: cypher-shell -u neo4j -p $NEO4J_PASSWORD < init_neo4j.cypher
// Or paste into Neo4j Browser / Bloom
// =============================================================================

// =============================================================================
// Constraints (enforce uniqueness + auto-index)
// =============================================================================
CREATE CONSTRAINT brand_id IF NOT EXISTS
    FOR (b:Brand) REQUIRE b.id IS UNIQUE;

CREATE CONSTRAINT brand_name IF NOT EXISTS
    FOR (b:Brand) REQUIRE b.name IS UNIQUE;

CREATE CONSTRAINT model_id IF NOT EXISTS
    FOR (m:Model) REQUIRE m.id IS UNIQUE;

CREATE CONSTRAINT generation_id IF NOT EXISTS
    FOR (g:Generation) REQUIRE g.id IS UNIQUE;

CREATE CONSTRAINT generation_uuid IF NOT EXISTS
    FOR (g:Generation) REQUIRE g.uuid IS UNIQUE;

CREATE CONSTRAINT trim_id IF NOT EXISTS
    FOR (t:Trim) REQUIRE t.id IS UNIQUE;

CREATE CONSTRAINT designer_name IF NOT EXISTS
    FOR (d:Designer) REQUIRE d.name IS UNIQUE;

CREATE CONSTRAINT design_language_name IF NOT EXISTS
    FOR (dl:DesignLanguage) REQUIRE dl.name IS UNIQUE;

CREATE CONSTRAINT era_name IF NOT EXISTS
    FOR (e:Era) REQUIRE e.name IS UNIQUE;

// =============================================================================
// Indexes
// =============================================================================
CREATE INDEX brand_country IF NOT EXISTS
    FOR (b:Brand) ON (b.country);

CREATE INDEX model_body_type IF NOT EXISTS
    FOR (m:Model) ON (m.body_type);

CREATE INDEX generation_year_start IF NOT EXISTS
    FOR (g:Generation) ON (g.year_start);

CREATE INDEX generation_year_end IF NOT EXISTS
    FOR (g:Generation) ON (g.year_end);

CREATE INDEX generation_design_language IF NOT EXISTS
    FOR (g:Generation) ON (g.design_language);

// Full-text search index for names
CREATE FULLTEXT INDEX vehicle_name_fulltext IF NOT EXISTS
    FOR (n:Brand|Model|Generation)
    ON EACH [n.name];

// =============================================================================
// Design Eras (decade-level nodes for timeline navigation)
// =============================================================================
MERGE (e1:Era {name: '1970s'}) SET e1.year_start = 1970, e1.year_end = 1979;
MERGE (e2:Era {name: '1980s'}) SET e2.year_start = 1980, e2.year_end = 1989;
MERGE (e3:Era {name: '1990s'}) SET e3.year_start = 1990, e3.year_end = 1999;
MERGE (e4:Era {name: '2000s'}) SET e4.year_start = 2000, e4.year_end = 2009;
MERGE (e5:Era {name: '2010s'}) SET e5.year_start = 2010, e5.year_end = 2019;
MERGE (e6:Era {name: '2020s'}) SET e6.year_start = 2020, e6.year_end = 2029;

// =============================================================================
// BMW
// =============================================================================
CREATE (bmw:Brand {
    id: 1, name: 'BMW', country: 'Germany',
    founded_year: 1916, headquarters: 'Munich',
    design_philosophy: 'Sheer Driving Pleasure'
})

CREATE (m3series:Model {
    id: 1, name: '3-Series', brand_id: 1,
    body_type: 'sedan', segment: 'D',
    description: 'BMW compact executive sedan, produced since 1975'
})

// BMW 3-Series generations
CREATE (e21:Generation {
    id: 1, uuid: 'e21-bmw-3series-1975',
    code_name: 'E21', year_start: 1975, year_end: 1983,
    name: 'BMW 3-Series E21',
    design_language: 'Classic Hofmeister kink',
    designer_name: 'Paul Bracq'
})
CREATE (e30:Generation {
    id: 2, uuid: 'e30-bmw-3series-1982',
    code_name: 'E30', year_start: 1982, year_end: 1994,
    name: 'BMW 3-Series E30',
    design_language: 'Classic BMW proportions',
    designer_name: 'Claus Luthe'
})
CREATE (e36:Generation {
    id: 3, uuid: 'e36-bmw-3series-1990',
    code_name: 'E36', year_start: 1990, year_end: 2000,
    name: 'BMW 3-Series E36',
    design_language: 'Aerodynamic refinement',
    designer_name: 'Erik Goplen'
})
CREATE (e46:Generation {
    id: 4, uuid: 'e46-bmw-3series-1997',
    code_name: 'E46', year_start: 1997, year_end: 2006,
    name: 'BMW 3-Series E46',
    design_language: 'Flame Surfacing preview',
    designer_name: 'Erik Goplen'
})
CREATE (e90:Generation {
    id: 5, uuid: 'e90-bmw-3series-2005',
    code_name: 'E90', year_start: 2005, year_end: 2013,
    name: 'BMW 3-Series E90',
    design_language: 'Flame Surfacing',
    designer_name: 'Chris Bangle'
})
CREATE (f30:Generation {
    id: 6, uuid: 'f30-bmw-3series-2011',
    code_name: 'F30', year_start: 2011, year_end: 2019,
    name: 'BMW 3-Series F30',
    design_language: 'EfficientDynamics design',
    designer_name: 'Karim Habib'
})
CREATE (g20:Generation {
    id: 7, uuid: 'g20-bmw-3series-2018',
    code_name: 'G20', year_start: 2018, year_end: 2025,
    name: 'BMW 3-Series G20',
    design_language: 'Sensual Purity',
    designer_name: 'Marc Lichte-influence / Domagoj Dukec'
})

// BMW 3-Series evolution chain
CREATE (e21)-[:EVOLVES_INTO {
    similarity_score: 0.72, year_delta: 7,
    confidence: 0.95, notable_changes: 'Wider stance, more aerodynamic'
}]->(e30)
CREATE (e30)-[:EVOLVES_INTO {
    similarity_score: 0.78, year_delta: 8,
    confidence: 0.97, notable_changes: 'Flush glass, improved aerodynamics'
}]->(e36)
CREATE (e36)-[:EVOLVES_INTO {
    similarity_score: 0.81, year_delta: 7,
    confidence: 0.96, notable_changes: 'Rounder profile, dual round headlights'
}]->(e46)
CREATE (e46)-[:EVOLVES_INTO {
    similarity_score: 0.74, year_delta: 8,
    confidence: 0.93, notable_changes: 'Flame Surfacing, angular headlights'
}]->(e90)
CREATE (e90)-[:EVOLVES_INTO {
    similarity_score: 0.80, year_delta: 6,
    confidence: 0.94, notable_changes: 'Cleaner lines, larger kidney grille'
}]->(f30)
CREATE (f30)-[:EVOLVES_INTO {
    similarity_score: 0.82, year_delta: 7,
    confidence: 0.97, notable_changes: 'Longer hood, frameless windows premium feel'
}]->(g20)

// BMW 5-Series (abbreviated)
CREATE (m5series:Model {id: 2, name: '5-Series', brand_id: 1, body_type: 'sedan', segment: 'E'})
CREATE (e28:Generation {id: 8, uuid: 'e28-bmw-5series-1981', code_name: 'E28', year_start: 1981, year_end: 1988, name: 'BMW 5-Series E28', design_language: 'Classic BMW'})
CREATE (e34:Generation {id: 9, uuid: 'e34-bmw-5series-1988', code_name: 'E34', year_start: 1988, year_end: 1996, name: 'BMW 5-Series E34', design_language: 'Refined classic'})
CREATE (e28)-[:EVOLVES_INTO {similarity_score: 0.76, year_delta: 7, confidence: 0.95}]->(e34)

// Relationships
CREATE (bmw)-[:MAKES]->(m3series)
CREATE (bmw)-[:MAKES]->(m5series)
CREATE (m3series)-[:HAS_GENERATION]->(e21)
CREATE (m3series)-[:HAS_GENERATION]->(e30)
CREATE (m3series)-[:HAS_GENERATION]->(e36)
CREATE (m3series)-[:HAS_GENERATION]->(e46)
CREATE (m3series)-[:HAS_GENERATION]->(e90)
CREATE (m3series)-[:HAS_GENERATION]->(f30)
CREATE (m3series)-[:HAS_GENERATION]->(g20)
CREATE (m5series)-[:HAS_GENERATION]->(e28)
CREATE (m5series)-[:HAS_GENERATION]->(e34)

// Era memberships
CREATE (e21)-[:BELONGS_TO_ERA]->(:Era {name: '1970s'})
CREATE (e30)-[:BELONGS_TO_ERA]->(:Era {name: '1980s'})
CREATE (e36)-[:BELONGS_TO_ERA]->(:Era {name: '1990s'})
CREATE (e46)-[:BELONGS_TO_ERA]->(:Era {name: '2000s'})
CREATE (e90)-[:BELONGS_TO_ERA]->(:Era {name: '2000s'})
CREATE (f30)-[:BELONGS_TO_ERA]->(:Era {name: '2010s'})
CREATE (g20)-[:BELONGS_TO_ERA]->(:Era {name: '2020s'})

// =============================================================================
// Ferrari
// =============================================================================
;
CREATE (ferrari:Brand {
    id: 2, name: 'Ferrari', country: 'Italy',
    founded_year: 1939, headquarters: 'Maranello',
    design_philosophy: 'Aggressive beauty, performance form'
})

CREATE (f_458:Model {id: 10, name: '458', brand_id: 2, body_type: 'coupe', segment: 'supercar'})
CREATE (f_488:Model {id: 11, name: '488', brand_id: 2, body_type: 'coupe', segment: 'supercar'})
CREATE (f_sf90:Model {id: 12, name: 'SF90 Stradale', brand_id: 2, body_type: 'coupe', segment: 'hypercar'})

CREATE (g_458:Generation {
    id: 20, uuid: 'ferrari-458-2009',
    code_name: '458', year_start: 2009, year_end: 2015,
    name: 'Ferrari 458 Italia',
    design_language: 'Pininfarina aerodynamic',
    designer_name: 'Pininfarina'
})
CREATE (g_488:Generation {
    id: 21, uuid: 'ferrari-488-2015',
    code_name: '488', year_start: 2015, year_end: 2019,
    name: 'Ferrari 488 GTB',
    design_language: 'Aerodynamic functional beauty',
    designer_name: 'Ferrari Styling Centre'
})
CREATE (g_sf90:Generation {
    id: 22, uuid: 'ferrari-sf90-2019',
    code_name: 'SF90', year_start: 2019, year_end: 2025,
    name: 'Ferrari SF90 Stradale',
    design_language: 'Hybrid performance form',
    designer_name: 'Ferrari Styling Centre'
})

CREATE (ferrari)-[:MAKES]->(f_458)
CREATE (ferrari)-[:MAKES]->(f_488)
CREATE (ferrari)-[:MAKES]->(f_sf90)
CREATE (f_458)-[:HAS_GENERATION]->(g_458)
CREATE (f_488)-[:HAS_GENERATION]->(g_488)
CREATE (f_sf90)-[:HAS_GENERATION]->(g_sf90)

CREATE (g_458)-[:EVOLVES_INTO {
    similarity_score: 0.76, year_delta: 6,
    confidence: 0.91, notable_changes: 'Added cooling strakes, twin-turbo bumps'
}]->(g_488)
CREATE (g_488)-[:EVOLVES_INTO {
    similarity_score: 0.68, year_delta: 4,
    confidence: 0.88, notable_changes: 'Hybrid architecture changes rear, F1-inspired cockpit'
}]->(g_sf90)

// =============================================================================
// Porsche 911
// =============================================================================
;
CREATE (porsche:Brand {
    id: 3, name: 'Porsche', country: 'Germany',
    founded_year: 1948, headquarters: 'Stuttgart',
    design_philosophy: 'Evolutionary design continuity'
})

CREATE (p911:Model {id: 20, name: '911', brand_id: 3, body_type: 'coupe', segment: 'supercar'})

CREATE (p901:Generation {id: 30, uuid: 'porsche-911-901-1963', code_name: '901/0', year_start: 1963, year_end: 1973, name: 'Porsche 911 (1st gen)', design_language: 'Original Butzi Porsche', designer_name: 'Ferdinand Alexander Porsche'})
CREATE (p930:Generation {id: 31, uuid: 'porsche-911-930-1974', code_name: '930', year_start: 1974, year_end: 1989, name: 'Porsche 911 (930 series)', design_language: 'Widened arches, whale tail', designer_name: 'Anatole Lapine'})
CREATE (p964:Generation {id: 32, uuid: 'porsche-911-964-1989', code_name: '964', year_start: 1989, year_end: 1994, name: 'Porsche 911 (964)', design_language: 'Flushed front end, integrated bumpers', designer_name: 'Harm Lagaay'})
CREATE (p993:Generation {id: 33, uuid: 'porsche-911-993-1993', code_name: '993', year_start: 1993, year_end: 1998, name: 'Porsche 911 (993)', design_language: 'Organic curves, last air-cooled', designer_name: 'Harm Lagaay'})
CREATE (p996:Generation {id: 34, uuid: 'porsche-911-996-1997', code_name: '996', year_start: 1997, year_end: 2005, name: 'Porsche 911 (996)', design_language: 'Fried-egg headlights, water-cooled era', designer_name: 'Pinky Lai'})
CREATE (p997:Generation {id: 35, uuid: 'porsche-911-997-2004', code_name: '997', year_start: 2004, year_end: 2012, name: 'Porsche 911 (997)', design_language: 'Return to round headlights', designer_name: 'Michael Mauer'})
CREATE (p991:Generation {id: 36, uuid: 'porsche-911-991-2011', code_name: '991', year_start: 2011, year_end: 2019, name: 'Porsche 911 (991)', design_language: 'Stretched wheelbase, electric steering', designer_name: 'Michael Mauer'})
CREATE (p992:Generation {id: 37, uuid: 'porsche-911-992-2018', code_name: '992', year_start: 2018, year_end: 2026, name: 'Porsche 911 (992)', design_language: 'Flush surfaces, digital interior', designer_name: 'Michael Mauer'})

CREATE (porsche)-[:MAKES]->(p911)
CREATE (p911)-[:HAS_GENERATION]->(p901)
CREATE (p911)-[:HAS_GENERATION]->(p930)
CREATE (p911)-[:HAS_GENERATION]->(p964)
CREATE (p911)-[:HAS_GENERATION]->(p993)
CREATE (p911)-[:HAS_GENERATION]->(p996)
CREATE (p911)-[:HAS_GENERATION]->(p997)
CREATE (p911)-[:HAS_GENERATION]->(p991)
CREATE (p911)-[:HAS_GENERATION]->(p992)

CREATE (p901)-[:EVOLVES_INTO {similarity_score: 0.71, year_delta: 11, confidence: 0.93}]->(p930)
CREATE (p930)-[:EVOLVES_INTO {similarity_score: 0.79, year_delta: 15, confidence: 0.95}]->(p964)
CREATE (p964)-[:EVOLVES_INTO {similarity_score: 0.85, year_delta: 4,  confidence: 0.97}]->(p993)
CREATE (p993)-[:EVOLVES_INTO {similarity_score: 0.69, year_delta: 4,  confidence: 0.88}]->(p996)
CREATE (p996)-[:EVOLVES_INTO {similarity_score: 0.77, year_delta: 7,  confidence: 0.94}]->(p997)
CREATE (p997)-[:EVOLVES_INTO {similarity_score: 0.83, year_delta: 7,  confidence: 0.96}]->(p991)
CREATE (p991)-[:EVOLVES_INTO {similarity_score: 0.88, year_delta: 7,  confidence: 0.98}]->(p992)

// =============================================================================
// Cross-brand design influence edges
// (AI-detected visual DNA similarities between different brands)
// =============================================================================
;
MATCH (e30:Generation {uuid: 'e30-bmw-3series-1982'})
MATCH (p993:Generation {uuid: 'porsche-911-993-1993'})
CREATE (e30)-[:INFLUENCED {
    influence_type: 'surfacing_language',
    similarity_score: 0.62,
    confidence: 0.74,
    notes: 'Both share 1980s European design school: clean flanks with defined character lines'
}]->(p993);

MATCH (g_458:Generation {uuid: 'ferrari-458-2009'})
MATCH (p991:Generation {uuid: 'porsche-911-991-2011'})
CREATE (g_458)-[:SHARES_DESIGN_DNA {
    dna_dimension: 'rear_diffuser_philosophy',
    similarity_score: 0.58,
    confidence: 0.71,
    notes: 'Post-2010 supercar aerodynamic integration trend'
}]->(p991);

// =============================================================================
// Design Language nodes
// =============================================================================
;
MERGE (dl1:DesignLanguage {name: 'Flame Surfacing'})
    SET dl1.brand = 'BMW', dl1.era = '2000s',
        dl1.description = 'Dramatic convex surfaces mimicking fire shapes, introduced by Chris Bangle';

MERGE (dl2:DesignLanguage {name: 'Sensual Purity'})
    SET dl2.brand = 'BMW', dl2.era = '2010s',
        dl2.description = 'Clean, taut surfaces; successor to Flame Surfacing under Karim Habib';

MERGE (dl3:DesignLanguage {name: 'Evolutionary Continuity'})
    SET dl3.brand = 'Porsche', dl3.era = 'timeless',
        dl3.description = '911 silhouette maintained across 60+ years with incremental evolution';

MATCH (e90:Generation {uuid: 'e90-bmw-3series-2005'}) MATCH (dl1:DesignLanguage {name: 'Flame Surfacing'})  CREATE (e90)-[:EXPRESSES]->(dl1);
MATCH (f30:Generation {uuid: 'f30-bmw-3series-2011'}) MATCH (dl2:DesignLanguage {name: 'Sensual Purity'})  CREATE (f30)-[:EXPRESSES]->(dl2);
MATCH (g20:Generation {uuid: 'g20-bmw-3series-2018'}) MATCH (dl2:DesignLanguage {name: 'Sensual Purity'})  CREATE (g20)-[:EXPRESSES]->(dl2);
MATCH (p992:Generation {uuid: 'porsche-911-992-2018'}) MATCH (dl3:DesignLanguage {name: 'Evolutionary Continuity'}) CREATE (p992)-[:EXPRESSES]->(dl3);
