import streamlit as st
import numpy as np
import pandas as pd
import altair as alt
import pydeck as pdk
from annotated_text import annotated_text
from streamlit_option_menu import option_menu
import matplotlib.pyplot as plt
import folium
from streamlit_folium import st_folium
from folium.plugins import HeatMap



# Charger les données


data1 = pd.read_csv("DataVisualisation/data1.csv", delimiter=',')
data2 = pd.read_csv("DataVisualisation/data2.csv", delimiter=',')
data_merged = pd.read_csv("DataVisualisation/data_merged.csv", delimiter=',')

# Set page configuration
st.set_page_config(page_title="Project Dashboard", 
                   page_icon="📊", 
                   layout="wide")

# Sidebar menu for navigation

# Menu avec des icônes personnalisées
with st.sidebar:
    selected = option_menu("Main Menu", 
                           ["About Me", "Data1", "Data2", "Data_Merged", "Visualizations", "Uber"], 
                           icons=['person-circle', 'gear', 'gear', 'gear', 'bar-chart-fill', 'taxi-front-fill'],  # Icône bar-chart-fill pour Visualizations et taxi-front-fill pour Uber
                           menu_icon="cast", 
                           default_index=1)


if selected == 'About Me':
    st.title('À propos de moi')
    st.write("Je suis un étudiant passionné en science des données à l'Université de Paris.")
    
    st.subheader('📍 Localisation')
    st.write("🏠 Paris, France")
    
    st.subheader('📬 Me contacter')
    col1, col2 = st.columns([1, 2])
    
    with col1:
        st.markdown('📬 [LinkedIn](https://www.linkedin.com/in/paul-kerdelhue-1b1b3b1b3/)', unsafe_allow_html=True)
    
    with col2:
        # Bouton pour télécharger le CV
        with open("DataVisualisation/CV KERDELHUE Paul (6).pdf", "rb") as file:
            btn = st.download_button(
                label="📄 Télécharger mon CV",
                data=file,
                file_name="Mon_CV.pdf",
                mime="application/pdf"
            )
    st.subheader('📝 Mon parcours')
    st.write("Je suis en formation dans le domaine de la science des données, où j'apprends à exploiter les données pour résoudre des problèmes complexes à travers l'analyse, la modélisation, et l'intelligence artificielle.")

    st.subheader('💼 Projets réalisés')
    st.write("Voici quelques projets sur lesquels j'ai travaillé :")
    
    st.markdown("""
    ### 🎵 [SpotyHub](https://datacamp40.netlify.app/datacamp/spotyhub/)
    Une application web permettant de découvrir de nouvelles musiques sur Spotify. Ce projet utilise l'API de Spotify pour extraire des données musicales et met en œuvre un système de recommandation basé sur l'historique d'écoute des utilisateurs.
    """)
# Load data for Data1, Data2, and Data_Merged
if selected == 'Data1':
    st.title('Visualisations of Data1: Employment Data by Sector and Region')

    st.write("### Aperçu des données de Data1")
    st.write(data1.head())  # Montrer un aperçu des premières lignes
    
    st.write("#### Description des colonnes clés de Data1")
    st.markdown("""
    - **idBank** : Identifiant unique des séries de données.
    - **Série arrêtée** : Indique si la série est terminée.
    - **Correction** : Type de correction appliquée (ex. : variations saisonnières).
    - **Indicateur** : Le type d'indicateur utilisé (ex. : emploi salarié).
    - **Activité** : Secteur d'activité (ex. : commerce, agriculture).
    - **Zone géographique** : Localisation régionale des données.
    - **Nature**, **Périodicité**, **Unité**, **Puissance** : Descripteurs supplémentaires.
    """)

    st.subheader("Statistiques descriptives des données numériques")
    st.write(data1.describe())


if selected == 'Data2':
    st.title('Visualisations of Data2: Quarterly Employment Data')

    st.write("### Aperçu des données de Data2")
    st.write(data2.head())  # Montrer un aperçu des premières lignes
    
    st.write("#### Description des colonnes clés de Data2")
    st.markdown("""
    - **Libellé** : Description des données, souvent sur les emplois par secteur.
    - **idBank** : Identifiant unique.
    - **Trimestres** : Colonnes représentant les emplois par trimestre (ex : 2001-T4, 2002-T1).
    """)
    
    st.subheader("Statistiques descriptives des trimestres")
    st.write(data2.describe())


if selected == 'Data_Merged':
    # Fusionner les deux datasets sur 'idBank'
    data_merged = pd.merge(data1, data2, on='idBank', how='inner')

    st.title('Visualisations of the Merged Data')

    st.write("### Fusion des données : Data1 et Data2 sur la colonne 'idBank'")
    st.write(data_merged.head())  # Montrer un aperçu des données fusionnées

    st.subheader("Statistiques descriptives des données fusionnées")
    st.write(data_merged.describe())


# Visualizations section
if selected == 'Visualizations':
    data = pd.read_csv('DataVisualisation/data_merged.csv')

    # Identifier les colonnes contenant des informations sur les périodes (ex: '2003-T1', '2003-T2')
    time_columns = [col for col in data.columns if 'T' in col]

    # Calculer la moyenne annuelle par secteur d'activité et zone géographique pour chaque région et secteur
    # Ici, nous allons diviser par le nombre de trimestres disponibles pour obtenir la vraie moyenne annuelle
    data["nombre_emplois"] = data[time_columns].mean(axis=1)

    # Filtrer les données pour le secteur "Commerce ; réparation d'automobiles et de motocycles"
    data_filtered = data[data['Activité'].str.contains("A17-GZ - Commerce ; réparation d'automobiles et de motocycles", regex=False)]

    # Trier les données par nombre d'employés et sélectionner les 15 premières régions
    top_15_regions = data_filtered.sort_values(by="nombre_emplois", ascending=False).head(15)

    plt.figure(figsize=(10, 6))
    plt.barh(top_15_regions['Zone géographique'], top_15_regions['nombre_emplois'], color='skyblue')
    plt.xlabel('Nombre d\'emplois en 2003')
    plt.ylabel('Région')
    plt.title('Top 15 des régions avec le plus grand nombre d\'emplois commercial dans l\'automobile jusqu\'en 2017')
    plt.gca().invert_yaxis()  # Inverser l'ordre des régions
    st.pyplot()
    


    # Les régions et leurs coordonnées (latitude, longitude)
    regions = {
        'Zone géographique': [
            '59 - Nord', '69 - Rhône', '75 - Paris', '92 - Hauts-de-Seine', 
            'Auvergne-Rhône-Alpes', 'Bourgogne-Franche-Comté', 'Bretagne', 
            'Centre-Val de Loire', 'Grand Est', 'Hauts-de-France', 'Normandie', 
            'Nouvelle-Aquitaine', 'Occitanie', 'Pays de la Loire', 
            'Provence-Alpes-Côte d\'Azur', 'Île-de-France'
        ],
        'latitude': [
            50.6292, 45.7640, 48.8566, 48.8471, 
            45.7597, 47.2805, 48.2020, 
            47.7516, 48.5855, 50.6292, 49.1829, 
            45.7597, 43.6045, 47.2184, 
            43.9352, 48.8566
        ],
        'longitude': [
            3.0573, 4.8357, 2.3522, 2.3174, 
            4.8357, 4.0827, -1.8312, 
            1.6751, 7.7427, 3.0573, -0.3708, 
            -0.3238, 1.4442, -1.5536, 
            6.0679, 2.3522
        ]
    }

    df_regions = pd.DataFrame(regions)

    # Fusionner les données géographiques avec les données des emplois
    data_geo = pd.merge(top_15_regions, df_regions, on='Zone géographique', how='inner')
    st.title('Visualisation des emplois moyens commercial dans l\'automobile par région jusqu\'en 2017, en 3d')
    # Mise à jour du tooltip pour utiliser le nouvel identifiant
    tooltip = {
        "html": "<b>Région :</b> {Zone géographique} <br/> <b>Nombre d'emplois en 2003 :</b> {nombre_emplois}",
        "style": {"backgroundColor": "steelblue", "color": "white"}
    }

    # Configuration de la vue initiale de la carte
    view_state = pdk.ViewState(
        latitude=46.603354,  
        longitude=1.888334,
        zoom=5,
        pitch=50
    )

    # Définir la couche ColumnLayer pour pydeck (carte 3D)
    column_layer = pdk.Layer(
        'ColumnLayer',
        data=data_geo,
        get_position=['longitude', 'latitude'],  
        get_elevation='nombre_emplois / 100',  
        elevation_scale=50,
        radius=20000,
        get_fill_color='[255, 140, 0, 200]',  
        pickable=True,
        auto_highlight=True,
    )

    # Créer le Deck pour pydeck
    deck = pdk.Deck(
        map_style='mapbox://styles/mapbox/light-v10',
        initial_view_state=view_state,
        layers=[column_layer],
        tooltip=tooltip
    )

    # Afficher la carte 3D
    st.pydeck_chart(deck)

    # Sélection de la région pour la visualisation
    st.title('Visualisation des emplois par secteur et région (moyenne annuelle)')
    region = st.selectbox('Sélectionnez une région pour le graphique en ligne', data['Zone géographique'].unique())

    # Filtrer les données selon la région sélectionnée
    filtered_data = data[data['Zone géographique'] == region]

    # Sélection du secteur d'activité pour la visualisation
    secteur = st.selectbox('Sélectionnez un secteur d\'activité pour le graphique en ligne', filtered_data['Activité'].unique())

    # Filtrer les données selon le secteur sélectionné
    filtered_data = filtered_data[filtered_data['Activité'] == secteur]

    # Extraire les colonnes qui représentent les périodes (trimestres)
    time_columns = [col for col in filtered_data.columns if 'T' in col]

  
    filtered_data_annual = pd.DataFrame()
    for col in time_columns:
        year = col.split('-')[0]  
        if year not in filtered_data_annual:
            filtered_data_annual[year] = filtered_data[[c for c in time_columns if c.startswith(year)]].mean(axis=1)

   
    emploi_data = filtered_data_annual.T
    emploi_data.columns = ['Emplois']  

    emploi_data.dropna(inplace=True)

    st.subheader(f'Nombre moyen d\'emplois pour {secteur} en {region} par année')

    fig, ax = plt.subplots()
    ax.plot(emploi_data.index, emploi_data['Emplois'], marker='o', linestyle='-', color='b')
    ax.set_ylabel('Nombre moyen d\'emplois')
    ax.set_xlabel('Année')
    ax.set_title(f'Évolution du nombre moyen d\'emplois dans {secteur} - {region}')

  
    ax.set_xticks(range(0, len(emploi_data.index)))
    ax.set_xticklabels(emploi_data.index, rotation=45, ha='right', fontsize=10)

    plt.tight_layout()

    st.pyplot(fig)

   
    st.title('Répartition des emplois par secteur dans une région (moyenne annuelle)')
    region_camembert = st.selectbox('Sélectionnez une région pour le camembert', data['Zone géographique'].unique())

    filtered_data_camembert = data[data['Zone géographique'] == region_camembert]
 
    trimestre_columns = [col for col in filtered_data_camembert.columns if 'T' in col]
    years = sorted(list(set([col.split('-')[0] for col in trimestre_columns])))


    selected_year = st.selectbox('Sélectionnez une année pour le camembert', years)

    # Regrouper les colonnes trimestrielles par année et calculer la moyenne des emplois pour chaque secteur
    filtered_data_camembert_year = filtered_data_camembert.copy()
    filtered_data_camembert_year['Emplois_annuels'] = filtered_data_camembert[[col for col in filtered_data_camembert.columns if selected_year in col]].mean(axis=1)

    # Nettoyage des données : supprimer les espaces, convertir en minuscules
    filtered_data_camembert_year['Activité'] = filtered_data_camembert_year['Activité'].str.strip().str.lower()

    # Exclure les catégories non pertinentes
    filtered_data_camembert_year = filtered_data_camembert_year[~filtered_data_camembert_year['Activité'].isin([
        'secteurs marchands non agricoles', 
        'a5-gu - tertiaire marchand',
        'ensemble des salariés - toutes les sections (hors activités extra-territoriales)'
    ])]

   
    secteurs_camembert = filtered_data_camembert_year['Activité']
    emplois_camembert = filtered_data_camembert_year['Emplois_annuels']

  
    secteurs_camembert = secteurs_camembert[emplois_camembert.notnull()]
    emplois_camembert = emplois_camembert[emplois_camembert.notnull()]

    st.subheader(f'Répartition des emplois par secteur en {region_camembert} pour l\'année {selected_year}')

    fig_camembert, ax_camembert = plt.subplots()
    ax_camembert.pie(emplois_camembert, labels=secteurs_camembert, autopct='%1.1f%%', startangle=90, counterclock=False)
    ax_camembert.axis('equal')  # Assure que le camembert est circulaire

    # Afficher le graphique
    st.pyplot(fig_camembert)

    # Afficher les données filtrées sous forme de tableau
    st.write('Données filtrées (camembert):', pd.DataFrame({'Secteur': secteurs_camembert, 'Emplois annuels (moyenne)': emplois_camembert}))
    # Coordonées géographiques des régions françaises (simplifiées)
    regions_coordinates = {
        'Île-de-France': [48.8566, 2.3522],
        'Auvergne-Rhône-Alpes': [45.7640, 4.8357],
        'Provence-Alpes-Côte d\'Azur': [43.9352, 6.0679],
        'Occitanie': [43.6045, 1.4442],
        'Nouvelle-Aquitaine': [44.8378, -0.5792],
        'Hauts-de-France': [50.6292, 3.0573],
        'Grand Est': [48.5855, 7.7427],
        'Bretagne': [48.2020, -1.8312],
        'Normandie': [49.1829, -0.3708],
        'Centre-Val de Loire': [47.7516, 1.6751],
        'Bourgogne-Franche-Comté': [47.2805, 4.0827],
        'Pays de la Loire': [47.2184, -1.5536]
    }

    # Interface Streamlit pour sélectionner le secteur et l'année
    st.title('Heatmap de l\'emploi en France')
    secteur_selectionne = st.selectbox('Sélectionnez un secteur', options=data['Activité'].unique())
    annee_selectionnee = st.selectbox('Sélectionnez une année', options=[col.split('-')[0] for col in data.columns if 'T' in col])

    # Filtrer les données par secteur et année
    data_filtre = data[data['Activité'] == secteur_selectionne]
    cols_numeriques = [col for col in data.columns if col.startswith(annee_selectionnee) and data[col].dtype in ['float64', 'int64']]
    data_filtre_annee = data_filtre[['Zone géographique'] + cols_numeriques]

    # Ajouter une moyenne pour simplifier les données annuelles
    data_filtre_annee['moyenne_emplois'] = data_filtre_annee[cols_numeriques].mean(axis=1)

    # Préparer les données pour la heatmap (région, latitude, longitude, emploi)
    heatmap_data = []
    for region, coord in regions_coordinates.items():
        emploi_region = data_filtre_annee[data_filtre_annee['Zone géographique'].str.contains(region, na=False)]
        if not emploi_region.empty:
            moyenne_emplois = emploi_region['moyenne_emplois'].values[0]
            heatmap_data.append([coord[0], coord[1], moyenne_emplois])

    # Création de la carte avec Folium
    m = folium.Map(location=[46.603354, 1.888334], zoom_start=6)  # Coordonnées centrales de la France

    # Ajouter la heatmap sur la carte
    HeatMap(heatmap_data).add_to(m)

    # Afficher la carte avec streamlit-folium
    st_folium(m, width=700, height=500)


# New Uber section
if selected == 'Uber':
    st.title('Visualizations of Uber Data')

    st.header("Uber data from April 2014")

    # Load the Uber data
    path = 'DataVisualisation/nyc_trips.csv'
    data = pd.read_csv(path, delimiter=',')

    # Display the data
    st.write(data)

    st.header('Data visualization')

    # Number of passengers and courses by hour
    st.subheader('Number of passengers, courses, tips and distance total per hour')
    passenger_by_hour = data.groupby('hour')['passenger_count'].sum()
    nb_course = data.groupby('hour').size()
    tips = data.groupby('hour')['tip_amount'].sum()
    Dist = data.groupby('hour')['trip_distance'].sum()

    chart_data = pd.DataFrame({
        'hour': passenger_by_hour.index,
        'Number of passengers': passenger_by_hour.values,
        'Number of courses': nb_course.values,
        'Tips': tips.values,
        'Distance': Dist.values
    })

    st.line_chart(chart_data.set_index('hour'))

    # Metrics at 10 pm
    st.subheader('Metrics at 10 pm')
    dist22 = data[data['hour'] == 22]['trip_distance'].sum()
    tips22 = data[data['hour'] == 22]['tip_amount'].sum()
    nb_course22 = data[data['hour'] == 22].shape[0]
    passenger22 = data[data['hour'] == 22]['passenger_count'].sum()

    col1, col2, col3, col4 = st.columns(4)
    col1.metric(label='Total distance', value=dist22)
    col2.metric(label='Total tips', value=tips22)
    col3.metric(label='Total number of courses', value=nb_course22)
    col4.metric(label='Total number of passengers', value=passenger22)

    # Metrics at 4 am
    st.subheader('Metrics at 4 am')
    dist4 = data[data['hour'] == 4]['trip_distance'].sum()
    tips4 = data[data['hour'] == 4]['tip_amount'].sum()
    nb_course4 = data[data['hour'] == 4].shape[0]
    passenger4 = data[data['hour'] == 4]['passenger_count'].sum()

    col1, col2, col3, col4 = st.columns(4)
    col1.metric(label='Total distance', value=dist4)
    col2.metric(label='Total tips', value=tips4)
    col3.metric(label='Total number of courses', value=nb_course4)
    col4.metric(label='Total number of passengers', value=passenger4)

    st.header('Map of the trips (pickup and dropoff)')

    pickup_points = data[['pickup_latitude', 'pickup_longitude']].rename(columns={
        'pickup_latitude': 'latitude',
        'pickup_longitude': 'longitude'
    })
    dropoff_points = data[['dropoff_latitude', 'dropoff_longitude']].rename(columns={
        'dropoff_latitude': 'latitude',
        'dropoff_longitude': 'longitude'
    })

    all_points = pd.concat([pickup_points, dropoff_points])
    
    st.map(all_points)

    st.title('Map of the trips (pickup and dropoff) with pydeck')

    chart_data = data[['pickup_latitude', 'pickup_longitude', 'dropoff_latitude', 'dropoff_longitude']]

    st.pydeck_chart(pdk.Deck(
        map_style='mapbox://styles/mapbox/light-v9',
        initial_view_state=pdk.ViewState(
            latitude=40.73061,
            longitude=-73.935242,
            zoom=10,
            pitch=50,
        ),
        layers=[
            pdk.Layer(
                'HexagonLayer',
                data=chart_data,
                get_position='[pickup_longitude, pickup_latitude]',
                radius=200,
                elevation_scale=4,
                elevation_range=[0, 1000],
                pickable=True,
                extruded=True,
            ),
            pdk.Layer(
                'ScatterplotLayer',
                data=chart_data,
                get_position='[dropoff_longitude, dropoff_latitude]',
                get_color='[200, 30, 0, 160]',
                get_radius=200,
            ),
        ],
    ))

