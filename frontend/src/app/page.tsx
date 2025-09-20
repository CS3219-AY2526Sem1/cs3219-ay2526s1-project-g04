'use client';

import * as React from 'react';
import {
  AppBar,
  Box,
  Stack,
  Toolbar,
  Typography
} from '@mui/material'
import { 
  SquaredOutlinedButton, 
  SquaredFilledButton,
  RoundedFilledButton 
} from "@/app/components/CustomButton";
import { openSans } from "@/app/ui/fonts";
import { ChevronRightIcon } from '@heroicons/react/24/outline';

export default function Home() {
  return (
    <main
      className="flex flex-col min-h-screen p-6"
      style={{
        background: 'radial-gradient(circle, #D3E0FB 50%, #E8DEFD 100%)'
      }}
    >

      {/* Top navigation bar */}
      <AppBar 
        position='sticky' 
        sx={{
          backgroundColor:'transparent',
          boxShadow: 'none'
        }}
      >
        <Toolbar>
          {/* Logo */}
          <Box sx={{ display: "flex", alignItems: "center", flexGrow: 1 }}>
            <Box
              component='img'
              src="/logo.png"
              alt="PeerPrep Logo"
              sx={{
                objectFit: "contain" ,
                height: "100%",
                maxHeight: { xs: "40px", sm: "56px", md: "72px" },
              }}
            />
          </Box>

          {/* Buttons */}
          <Stack direction='row' spacing={2}>
            <SquaredOutlinedButton
              href='/login'
            >
              Log In
            </SquaredOutlinedButton>

            <SquaredFilledButton
              href='/sign-up'
            >
              Sign Up
            </SquaredFilledButton>
          </Stack>

        </Toolbar>
      </AppBar>

      <Box 
        sx={{ 
          flexGrow: 1,
          display: 'flex',
          justifyContent: 'center', 
          alignItems: 'flex-start',
          pt: 4
        }}
      >
        <Stack 
          direction='column' 
          alignItems='center'
          spacing={2}
        >
          <Typography
            sx={{ 
              textAlign: 'center',
              color: '#141127',
              fontFamily: openSans.style.fontFamily,
              fontWeight: 800,
              fontSize: '38px'
            }}
          >
            Collaboration is the best algorithm.
          </Typography>

          <Typography
            sx={{ 
              textAlign: 'center',
              color: '#6D6B80',
              fontFamily: openSans.style.fontFamily,
              fontSize: '20px',
              width: { xs: 'auto', md: '650px' }
            }}
          >
            PeerPrep lets you prepare for technical interviews live with peers—get matched and start solving together!
          </Typography>

          <RoundedFilledButton
            customFillColor='#905CF6'
            href='/sign-up'
          >
            <Stack direction='row' spacing={2}>
              Start Practicing
              <ChevronRightIcon color='#FFFFFF' className="w-5 md:w-6"/>
            </Stack>
          </RoundedFilledButton>

          {/* Spacer */}
          <Box sx={{ height: 100 }} />
          
          {/* Cards */}
          <Stack 
            direction= {{ xs: 'column', md: 'row'}}
            spacing={{ xs: 20, md: 5 }}
          >
            <Box 
              sx={{ 
                position: 'relative',
                borderRadius: '10px',
                width: '300px',
                height: '360px',
                display: 'flex',
                background: '#FFFFFF',
                justifyContent: 'center',
                alignItems: 'center',
                textAlign: 'center',
                padding: '30px',
                boxShadow: '0px 4px 30px #8B5CF6'
              }}
            >
              <Box
                component='img'
                src='/landing_page/customise_card_img.png'
                alt='Practice Image'
                sx = {{
                  width: '160px',
                  height: 'auto',
                  position: 'absolute',
                  top: '-90px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                }}
              />
              <Stack 
                direction='column'
                spacing={1}
              >
                <Typography
                  sx={{
                    color: '#8B5CF6',
                    fontFamily: openSans.style.fontFamily,
                    fontWeight: 700,
                    fontSize: '24px'
                  }}
                >
                  Customise Your Practice
                </Typography>
                <Typography
                  sx={{
                    color: '#6B7280',
                    fontFamily: openSans.style.fontFamily,
                    fontWeight: 400,
                    fontSize: '12px'
                  }}
                >
                  Choose the difficulty level and topic that fit your goals. Whether you want to brush up on arrays, tackle graph problems, or push yourself with dynamic programming, PeerPrep adapts to your needs.
                </Typography>
              </Stack>
            </Box>

            <Box 
              sx={{
                position: 'relative',
                borderRadius: '10px',
                width: '300px',
                height: '360px',
                display: 'flex',
                background: '#FFFFFF',
                justifyContent: 'center',
                alignItems: 'center',
                textAlign: 'center',
                padding: '30px',
                boxShadow: '0px 4px 30px #2563EB'
              }}
            >
              <Box
                component='img'
                src='/landing_page/collaboration_card_img.png'
                alt='Practice Image'
                sx = {{
                  width: '160px',
                  height: 'auto',
                  position: 'absolute',
                  top: '-90px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                }}
              />
              <Stack 
                direction='column'
                spacing={1}
              >
                <Typography
                  sx={{
                    color: '#2563EB',
                    fontFamily: openSans.style.fontFamily,
                    fontWeight: 700,
                    fontSize: '24px'
                  }}
                >
                  Real-time Collaboration
                </Typography>
                <Typography
                  sx={{
                    color: '#6B7280',
                    fontFamily: openSans.style.fontFamily,
                    fontWeight: 400,
                    fontSize: '12px'
                  }}
                >
                  Work together with peers in a live coding environment that updates instantly as you type. Share ideas, debug together, and simulate the teamwork of real interview settings.
                </Typography>
              </Stack>
            </Box>
            
            <Box 
              sx={{
                position: 'relative',
                borderRadius: '10px',
                width: '300px',
                height: '360px',
                display: 'flex',
                background: '#FFFFFF',
                justifyContent: 'center',
                alignItems: 'center',
                textAlign: 'center',
                padding: '30px',
                boxShadow: '0px 4px 30px #8B5CF6'
              }}
            >
              <Box
                component='img'
                src='/landing_page/interview_card_img.png'
                alt='Practice Image'
                sx = {{
                  width: '160px',
                  height: 'auto',
                  position: 'absolute',
                  top: '-90px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                }}
              />
              <Stack 
                direction='column'
                spacing={1}
              >
                <Typography
                  sx={{
                    color: '#8B5CF6',
                    fontFamily: openSans.style.fontFamily,
                    fontWeight: 700,
                    fontSize: '24px'
                  }}
                >
                  Prepare For Interviews
                </Typography>
                <Typography
                  sx={{
                    color: '#6B7280',
                    fontFamily: openSans.style.fontFamily,
                    fontWeight: 400,
                    fontSize: '12px'
                  }}
                >
                  Tackle curated technical interview problems that mirror the style and difficulty of top tech company interviews. Every question is designed to strengthen the skills recruiters are really testing.
                </Typography>
              </Stack>
            </Box>
          </Stack>

        </Stack>
      </Box>
    </main>
  );
}
