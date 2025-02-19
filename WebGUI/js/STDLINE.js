/*===============================================================================*
 * complexLayout.js:   the javascript code to instantiate a root objects         *
 *                     navigator in the otsdaq framework                         *
 *                                                                               *
 * Copyright (C) 2019                                                            *
 *                                                                               *
 * Authors: Dario Menasce                                                        *
 *                                                                               *
 * INFN: Piazza della Scienza 3, Edificio U2, Milano, Italy 20126                *
 *                                                                               *
 * This program is free software: you can redistribute it and/or modify          *
 * it under the terms of the GNU General Public License as published by          *
 * the Free Software Foundation, either version 3 of the License, or             *
 * (at your option) any later version.                                           *
 *                                                                               *
 * This program is distributed in the hope that it will be useful,               *
 * but WITHOUT ANY WARRANTY; without even the implied warranty of                *
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the                 *
 * GNU General Public License for more details.                                  *
 *                                                                               *
 * You should have received a copy of the GNU General Public License             *
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.         *
 ================================================================================*/

var enableDebug_ = false ;
//--------------------------------------------------------------------------------
function enableSTDLINE(enable)
{
 enableDebug_ = enable ;
}

//--------------------------------------------------------------------------------
function STDLINE(str)
{
  if( !enableDebug_ ) return ;
  const e = new Error();
  const a = e.stack.split("\n")[1] ;
  const w = a.split("/") ;
  const s = w.length -1 ;
  const l = w[s].split(":")[1] ;
  const n = w[s].split(":")[0] ;
  const m = l+"] ["+n+"] "+str ;
  console.log(m) ;
}

//--------------------------------------------------------------------------------
function STDGETLNUM()
{
  const e = new Error();
  const a = e.stack.split("\n")[1] ;
  const w = a.split("/") ;
  const s = w.length -1 ;
  const l = w[s].split(":")[1] ;
  const n = w[s].split(":")[0] ;
  return l ;
}
