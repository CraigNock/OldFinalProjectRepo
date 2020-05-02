import React, { useRef, useEffect, useState } from 'react'; 
import styled, {keyframes} from 'styled-components'; 
import { useDispatch, useSelector } from 'react-redux';

import { Map, Marker, Popup, TileLayer } from "react-leaflet";
import L, { Icon } from "leaflet";
// import { DriftMarker } from "leaflet-drift-marker";

import balloon from '../../assets/balloon.svg'
import useInterval from '../../hooks/use-interval-hook';
import { updateLocation 
} from '../../reducersActions/userActions';
import { updateCurrentConditions 
} from '../../reducersActions/conditionsActions';
import fetchConditions from './fetchConditions'
import findNextLoc from './findNextLoc';
import nearbyBalloonSync from './nearbyBalloonSync';



const ballooon = new Icon({
  iconUrl: balloon,
  iconSize: [15, 15]
});


const MapMap = () => { 
  // console.log('LOAD MAP');

  const { profile } = useSelector((state) => state.user);
  //add if active===false stop everything(toggle active else where)
  // console.log('profile', profile);
  const { windSum, windBearing } = useSelector((state) => state.conditions.current);
  const dispatch = useDispatch();

  const [launch, setLaunch] = useState(false);
  const [anchored, setAnchored] = useState(true);
  const [nearbyBalloons, setNearbyBalloons] = useState([]);

  const [newLoc, setNewLoc] = useState(profile.location);
  // const [currentCenter, setCurrentCenter] = useState(profile.location);
  const [ggg, setggg] = useState(false);

//ON MOUNT FETCH CONDITIONS
  const handleConditions = async () => {
    try {
      let conno = await fetchConditions(profile.location);
      console.log('conno', conno);
      if(conno) dispatch(updateCurrentConditions(conno));

    } catch (err) {
      console.log('handlecond error', err)
    };
  };
  useEffect(() => {
    handleConditions();
//on dismount clear the intervals below
    return ()=> {
      console.log('clean intervals'); 
      clearInterval(freshBreeze);
      clearInterval(checkpoint); 
      clearInterval(updateDestination);
      clearInterval(beef);
    };
// eslint-disable-next-line
  }, []);
//FRESH WEATHER EVERY 10MINS 
  const freshBreeze = useInterval(() => {
    handleConditions();
  }, 600000);
  
//TRIGGERS PAN METHOD ON DESTINATION CHANGE, ZOOM
  const mapRef = useRef();
  // const markRef = useRef();
  const panToOptions = {
        animate: true,
        duration: 60, //seconds
        easeLinearity: 1,
      };
  useEffect(() => {
  //   console.log('useeffect mapRef', mapRef);
    const { current } = mapRef;
    const { leafletElement } = current;
    setTimeout(()=>{
      console.log('panTo');
      leafletElement.panTo(newLoc, panToOptions)
    }, 100);
// eslint-disable-next-line
  }, [mapRef, newLoc, ggg]);


//KEEPS BALLOON MOVING - Trigged on Launch
//use findNextLoc on stored speed and bearing with current center then set as newloc
  const newLeg = async (anchor) => {
    console.log('newLeg windSum, windBearing', windSum, windBearing);
    if (!anchor) {
    let newDest = await findNextLoc(
      mapRef.current.viewport.center[0], 
      mapRef.current.viewport.center[1], 
      windBearing,
      (windSum * 10 *  profile.elevation) 
    );
    console.log('newDest', newDest);
    setNewLoc(newDest);
    } else {
      setNewLoc(mapRef.current.viewport.center);
    }
  }

  const updateDestination = useInterval(()=>{
    // console.log('minint');
    if(launch) newLeg();
  },59000);

  useEffect(() => {
    if(mapRef.current.viewport.center)newLeg();
  }, [profile.elevation]);

//STORES BALLOON LOCATION EVERY 10 SECONDS lastVector issue:billion calls
  const updateVector = () => {
    console.log('vector update');
      fetch('/newLastVector', {
        method: 'PUT',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: profile.userId,
          lastActive: (new Date()).getTime(),
          lastLocation: [...mapRef.current.viewport.center], 
          lastBearing: windBearing,
          lastWindSum: windSum,
          lastElevation: profile.elevation,
        }),
      }).catch(err => {console.log('udv err', err);})
  };

  const checkpoint = useInterval(()=>{
    // console.log('int 10s viewcenter', mapRef.current.viewport.center);
    dispatch(updateLocation([...mapRef.current.viewport.center]));
    updateVector();
  }, 10000);



  const beef = useInterval(async ()=>{
    // console.log('syncsync');
    let newBalloons = await nearbyBalloonSync({
    location: profile.location,
    bearing: windBearing,
    displayName: profile.displayName,
    userId: profile.userId,
    });
    setNearbyBalloons(newBalloons) ;
    console.log('nearbyBalloons', nearbyBalloons);
  }, 15000);

//kept balloon marker centered (jittery/resource intensive)
  // const centerMark = () => {setCurrentCenter(mapRef.current.viewport.center)};

  return ( 
    <StyledDiv> 
      
      <Map 
        ref={mapRef}
        defaultCenter={profile.location} 
        zoom={14}
        zoomSnap={2}
        zoomControl={false}
        dragging={false}
        doubleClickZoom={'center'}
        scrollWheelZoom={'center'}
        touchZoom={'center'}
        onZoomEnd={()=> setggg(!ggg)}
        // onClick={()=>newnew()}
        // onMove={centerMark}
      >
        {/* <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="http://osm.org/copyright">OSM</a> contributors' /> */}
        <TileLayer
          url={`https://tile.thunderforest.com/pioneer/{z}/{x}/{y}.png?apikey=${process.env.REACT_APP_THUNDERFOREST_MAPTILES_KEY}`}
          attribution='&copy; <a href="http://osm.org/copyright">OSM</a> contributors' />

        <StyledBalloon src={balloon} />
        
        <StyledButton 
          onClick={()=>{
            setLaunch(true);
            setAnchored(false);
            newLeg();
          }}
          style={{display: launch? 'none' : 'flex'}}
        >Launch!</StyledButton>
        <StyledButton 
          onClick={()=>{
            setLaunch(false);
            setAnchored(true)
            newLeg('anchor');
          }}
          style={{display: (profile.elevation==1 && !anchored)? 'flex' : 'none'}}
        >Anchor?</StyledButton>

        {( nearbyBalloons.map((balloon) => {
          return (
            <Marker
            key={balloon.userId}
            position={balloon.location} 
            icon={ballooon}
            >
            </Marker>
          )
        }))}


        <Marker
          position={[45.50, -73.60]} 
          icon={ballooon}></Marker>
        {/* <DriftMarker 
          // ref={markRef} 
          position={newLoc} 
          duration={60000}
          icon={ballooon}
          // keepAtCenter={true}
        ></DriftMarker>  */}
      </Map>
    </StyledDiv>
    
  ) 
}; 




export default MapMap;


const balloonBob = keyframes`
  0% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(4px);
  }
  100% {
    transform: translateY(0);
  }
`;


const StyledDiv = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  margin: 0 auto;
  height: 60vh;
  width: 60vw;
  border: 8px ridge goldenrod;
  border-radius: 10px;
  box-shadow: 5px 5px 15px 5px rgba(0,0,0,0.53);

`;

// const StyledMarker = styled(Marker)`
//   /* -webkit-transition: transform 3s linear;
//   -moz-transition: transform 3s linear;
//   -o-transition: transform 3s linear;
//   -ms-transition: transform 3s linear;
//   transition: transform 3s linear;  */
// `;

//make this it's own component, custom color/balloon
const StyledBalloon = styled.img`
  position: absolute;
  top: 50% ;
  left: 50%;
  height: 30px;
  width: 30px;
  margin: -15px 0 0 -15px;
  z-index: 2000;
  animation: ${balloonBob} 4s ease-in-out infinite ;
`;
const StyledButton = styled.button`
  position: absolute;
  justify-content: center;
  width: 4rem;
  top: 50%;
  left: 50%;
  margin: 30px 0 0 -2rem;
  z-index: 2000;
  border: 2px solid goldenrod;
  border-radius: 10px;
  color: white;
  background: gray;
`;

// const Pinpoint = styled.div`
//   height:1px;
//   width: 1px;
//   position: absolute;
//   top: 50% ;
//   left: 50%;
//   z-index: 2002;
//   background: pink;
// `;