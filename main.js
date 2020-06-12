class GameCell
{
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.mines = 0;
        this.is_mine = false;
        this.is_open = false;
        this.flag = false;
    }

    swap(cell)
    {
        this.swapVals(cell, 'is_mine');
        this.swapVals(cell, 'mines');
        this.swapVals(cell, 'is_open');
        this.swapVals(cell, 'flag');

    }

    swapVals(cell, field)
    {
        const val = this[field];
        this[field] = cell[field];
        cell[field] = val;
    }
}

var app = new Vue({
    el: '#app',
    data: function() {
        return {
            map: [],

            game_width: 0,
            game_height: 0,
            mines_number: 0,

            options:
            {
                game_width: 20,
                game_height: 20,
                mines_number: 40,
            },

            game_state: 'init',

            cells_opened: 0,
            flags_count: 0,

        }
    },
    computed:
    {
        cells_closed()
        {
            return this.game_height*this.game_width - this.cells_opened;
        }
    },
    created()
    {
        this.applyOptions();
    },
    methods:
    {
        applyOptions()
        {
            for(let opt in this.options)
                this[opt] = this.options[opt];

            this.resetGame();
        },
        resetGame()
        {
            this.game_state = 'init';
            this.cells_opened = 0;
            this.flags_count = 0;
            this.clearBoard();
            // this.seedMines();
           
        },
        clearBoard()
        {
            this.map = [];
            for(let y=0; y<this.game_height; y++ ){
                this.map.push([]);
                for(let x=0; x<this.game_width; x++ )
                {
                    this.map[y].push(new GameCell(x, y));
                }
            }
        }, 
        seedMines(except_cell)
        {
            const cells_num = this.game_width*this.game_height;
            const except_n = except_cell.y*this.game_width + except_cell.x;

            for(let n=0; n<this.mines_number; ++n)
                if(n !== except_n)
                    this.cellLine(n).is_mine = true;
            
            for(let n=0; n < cells_num-1; ++n)
                if(n !== except_n)
                {
                    const exception = n < except_n;

                    let target = n + 
                        Math.floor(
                            Math.random() *(cells_num - n) 
                            + (exception ? -1 : 0)
                        );

                    if(exception && target >= except_n)
                        target++;

                    const cellN = this.cellLine(n);
                    const cellTarget = this.cellLine(target);

                    cellN.swap(cellTarget);
                }
        },
        cellLine(n)
        {
            return this.cell(n%this.game_width, Math.floor(n/this.game_width));
        },
        cell(x, y)
        {
            return (x>=0 && y>= 0 && x<this.game_width && y < this.game_height)
                ? this.map[y][x]
                : null;
        },
        cellClass(cell)
        {
            return cell.is_open
                ? [cell.is_mine ? 'mine' : 'digit-'+cell.mines]
                : ['closed', cell.flag ? 'flag' : ''];
        },
        onCellClick(cell)
        {
            this.checkInit(cell);

            if(this.game_state === 'play' && !cell.is_open)
            {
                
                if(cell.is_mine)
                    this.failGame();
                else
                    this.openCellStart(cell, false);
            }
        },
        onCellRightClick(cell)
        {
            this.checkInit(cell);
            if(this.game_state === 'play')
            {
                if(cell.is_open)
                {
                    this.openCellStart(cell, true);
                }
                else
                {
                    this.setCellFlag(cell, !cell.flag);
                }
                
            }
        },
        openCellStart(cell, unsafe)
        {
            try
            {
                this[unsafe ? 'unsafeOpenCell' : 'openCell'](cell);

                if( this.cells_closed === parseInt(this.mines_number))
                    this.winGame();
            }
            catch(e)
            {
                this.failGame();
            }
        },
        unsafeOpenCell(cell)
        {
            // если количество неоткрых ячеек совпадает с количеством мин вокруг неё,
            // то помечаем их флагами

            if( this.countClosedAround(cell) === cell.mines)
            {
                this.walkAround(cell, neighbour => {
                    if(!neighbour.is_open)
                        this.setCellFlag(neighbour, true);
                });
            }

            const flags = this.countFlagsAround(cell);

            if(flags === cell.mines)
            {
                this.walkAround(cell, neighbour => {
                    if(!neighbour.is_open && !neighbour.flag)
                    {
                        if(neighbour.is_mine)
                            throw "Взорвались!";

                        this.setCellOpen(neighbour);

                        this.unsafeOpenCell(neighbour);
                    }
                });

            }
        },
        setCellFlag(cell, flag)
        {
            if(flag !== cell.flag)
            {
                cell.flag = flag;
                
                this.flags_count += flag ? 1 : -1;
            }
                
        },
        openCell(cell)
        {
            if(cell && !cell.is_open)
            {
                this.setCellOpen(cell);

                if(cell.is_mine)
                    throw "взорвались";

                if(cell.mines === 0)
                    this.walkAround(cell, 
                        neighbour => this.openCell(neighbour) );
                    
            }

        },
        setCellOpen(cell)
        {
            if(!cell.is_open)
            {
                cell.is_open = true;
                this.cells_opened++;
                this.setCellFlag(cell, false);

                if(!cell.is_mine)
                {
                    cell.mines = this.countMinesAround(cell);
                }
            }

        },
        checkInit(cell)
        {
            if(this.game_state === 'init')
            {
                this.game_state = 'play';
                this.seedMines(cell);
            }
        },
        failGame()
        {
            this.game_state = 'fail';  
            this.openAllCells();
        },
        winGame()
        {
            console.log('WIN!!!')
            this.game_state = 'win';  
            this.openAllCells();
        },
        openAllCells()
        {
            for(let y=0; y<this.map.length; ++y)
                for(let x=0; x<this.map.length; ++x)
                {
                    let cell = this.cell(x, y);
                    this.setCellOpen(cell);

                    if( !cell.is_mine )
                        cell.mines = this.countMinesAround(cell);
                }
        },
        countMinesAround(cell)
        {
            return this.countCellsAround(cell, neighbour => neighbour.is_mine);
        },
        countClosedAround(cell)
        {
            return this.countCellsAround(cell, neighbour => !neighbour.is_open);
        },
        countFlagsAround(cell)
        {
            return this.countCellsAround(cell, neighbour => neighbour.flag);
        },
        countCellsAround(cell, filter)
        {
            let num = 0;
            
            this.walkAround(cell, 
                neighbour => num += filter(neighbour) ? 1 : 0
            );

            return num;
        },
        walkAround(cell, callback)
        {
            let neighbour;

            for(let dx=-1; dx<2; ++dx)
                for(let dy=-1; dy<2; ++dy)
                    if((dx || dy) && (neighbour = this.cell(cell.x+dx, cell.y+dy)))
                        callback(neighbour);
        }
    }
})